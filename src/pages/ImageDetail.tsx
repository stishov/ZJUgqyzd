import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import type { Tables } from '../supabase/types';
import {
  Heart,
  Download,
  Share2,
  ArrowLeft,
  Calendar,
  User,
  Eye,
  Maximize2,
  X,
  Check,
  Trash2,
  Edit,
  Tag,
  MapPin,
  Save,
  Image as ImageIcon,
} from 'lucide-react';

// 图片展示组件 - 仅支持 Meoo Cloud Storage
function SafeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`${className} bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}>
        <ImageIcon className="w-12 h-12 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}

type ImageType = Tables<'images'>;
type CategoryType = Tables<'categories'>;
type ProfileType = Tables<'profiles'>;
type YearType = Tables<'years'>;
type LocationType = Tables<'locations'>;

interface ImageDetail extends ImageType {
  category?: CategoryType;
  profile?: ProfileType;
}

export default function ImageDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, isModerator } = useAuth();
  const [image, setImage] = useState<ImageDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [relatedImages, setRelatedImages] = useState<ImageDetail[]>([]);
  
  // 编辑标签相关状态
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [years, setYears] = useState<YearType[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [editCategoryId, setEditCategoryId] = useState<string>('');
  const [editYearId, setEditYearId] = useState<string>('');
  const [editLocationId, setEditLocationId] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (id) {
      fetchImage();
      checkFavorite();
    }
  }, [id]);

  async function fetchImage() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('images')
        .select('*, category:categories(*), profile:profiles(*)')
        .eq('id', id!)
        .single();

      if (error) throw error;

      if (data) {
        setImage(data as ImageDetail);
        incrementViewCount(data.id);
        fetchRelatedImages(data.category_id, data.id);
      }
    } catch (error) {
      console.error('Error fetching image:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function incrementViewCount(imageId: string) {
    await supabase.rpc('increment_view_count', { image_id: imageId });
  }

  async function fetchRelatedImages(categoryId: string | null, excludeId: string) {
    if (!categoryId) return;
    const { data } = await supabase
      .from('images')
      .select('*, profile:profiles(username, display_name)')
      .eq('category_id', categoryId)
      .eq('is_approved', true)
      .neq('id', excludeId)
      .limit(4);
    if (data) setRelatedImages(data as ImageDetail[]);
  }

  async function checkFavorite() {
    if (!user || !id) return;
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .eq('image_id', id)
      .maybeSingle();
    setIsFavorite(!!data);
  }

  async function toggleFavorite() {
    if (!user || !id) {
      navigate('/login');
      return;
    }

    if (isFavorite) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('image_id', id);
      setIsFavorite(false);
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, image_id: id });
      setIsFavorite(true);
    }
  }

  async function handleDownload() {
    if (!image) return;

    setDownloadStatus('downloading');
    setDownloadProgress(0);

    try {
      // 先更新下载次数
      await supabase
        .from('images')
        .update({ download_count: (image.download_count || 0) + 1 })
        .eq('id', image.id);

      // 仅支持 Meoo Cloud Storage 下载
      const urlParts = image.file_path.split('/sb-api/storage/v1/object/public/');
      if (urlParts.length !== 2) {
        throw new Error('不支持的图片来源，请使用 Meoo Cloud Storage 上传的图片');
      }

      const [bucketAndPath] = urlParts[1].split('/');
      const filePath = urlParts[1].substring(bucketAndPath.length + 1);

      const { data, error } = await supabase.storage
        .from(bucketAndPath)
        .download(filePath);

      if (error) {
        throw new Error(`下载失败: ${error.message}`);
      }

      if (!data) {
        throw new Error('下载数据为空');
      }

      // 创建下载链接
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = image.file_name || `image_${image.id}.jpg`;
      document.body.appendChild(link);
      link.click();

      // 清理
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadStatus('success');
      setDownloadProgress(100);

      // 3秒后重置状态
      setTimeout(() => {
        setDownloadStatus('idle');
        setDownloadProgress(null);
      }, 3000);
    } catch (error) {
      console.error('Download error:', error);
      setDownloadStatus('error');
      setDownloadProgress(null);

      // 3秒后重置状态
      setTimeout(() => {
        setDownloadStatus('idle');
      }, 3000);
    }
  }

  async function handleDelete() {
    if (!image || !confirm('确定要删除这张图片吗？')) return;
    
    await supabase
      .from('images')
      .delete()
      .eq('id', image.id);
    
    navigate('/gallery');
  }

  async function handleApprove() {
    if (!image) return;
    await supabase
      .from('images')
      .update({ is_approved: true })
      .eq('id', image.id);
    fetchImage();
  }

  // 获取分类数据
  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (data) setCategories(data);
  }

  async function fetchYears() {
    const { data } = await supabase
      .from('years')
      .select('*')
      .order('year', { ascending: false });
    if (data) setYears(data);
  }

  async function fetchLocations() {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('sort_order', { ascending: true });
    if (data) setLocations(data);
  }

  // 打开编辑模态框
  function openEditModal() {
    if (!image) return;
    fetchCategories();
    fetchYears();
    fetchLocations();
    setEditCategoryId(image.category_id || '');
    setEditYearId(image.year_id || '');
    setEditLocationId(image.location_id || '');
    setShowEditModal(true);
  }

  // 生成标签数组
  function generateTags(): string[] {
    const tags: string[] = [];
    
    const yearData = years.find(y => y.id === editYearId);
    if (yearData) tags.push(`${yearData.year}年`);
    
    const catData = categories.find(c => c.id === editCategoryId);
    if (catData) tags.push(catData.name);
    
    const locData = locations.find(l => l.id === editLocationId);
    if (locData) tags.push(locData.name);
    
    return tags;
  }

  // 保存标签修改
  async function handleSaveTags() {
    if (!image || !id) return;
    setIsUpdating(true);
    
    try {
      const newTags = generateTags();
      
      const { error } = await supabase
        .from('images')
        .update({
          category_id: editCategoryId || null,
          year_id: editYearId || null,
          location_id: editLocationId || null,
          tags: newTags.length > 0 ? newTags : null,
        })
        .eq('id', id);
      
      if (error) throw error;
      
      setShowEditModal(false);
      fetchImage();
    } catch (error) {
      console.error('Error updating tags:', error);
      alert('更新标签失败，请重试');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      // 显示简洁提示
      const btn = document.getElementById('copy-link-btn');
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 mr-2"><polyline points="20 6 9 17 4 12"></polyline></svg>已复制';
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);
      }
    } catch (error) {
      console.error('复制失败:', error);
      alert('复制失败，请手动复制链接');
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!image) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            图片不存在
          </h1>
          <Link to="/gallery" className="text-red-600 hover:underline">
            返回图库
          </Link>
        </div>
      </div>
    );
  }

  const canEdit = user && (user.id === image.user_id || isModerator);
  const canDelete = user && (user.id === image.user_id || isModerator);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          返回
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg"
            >
              <div
                className="relative aspect-[4/3] cursor-zoom-in group"
                onClick={() => setShowFullscreen(true)}
              >
                <SafeImage
                  src={image.file_path}
                  alt={image.title}
                  className="w-full h-full object-contain bg-gray-100 dark:bg-gray-900"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Maximize2 className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </motion.div>

            {relatedImages.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  相关图片
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {relatedImages.map((img) => (
                    <Link
                      key={img.id}
                      to={`/image/${img.id}`}
                      className="aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                    >
                      <SafeImage
                        src={img.thumbnail_path || img.file_path}
                        alt={img.title}
                        className="w-full h-full object-cover"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {image.title}
                </h1>
                {!image.is_approved && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-sm">
                    待审核
                  </span>
                )}
              </div>

              {image.description && (
                <div className="mb-6">
                  <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                    {image.description}
                  </p>
                </div>
              )}

              {image.tags && image.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {image.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleFavorite}
                  className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-colors ${
                    isFavorite
                      ? 'bg-red-50 text-red-600 dark:bg-red-900/20'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  <Heart className={`w-5 h-5 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                  {isFavorite ? '已收藏' : '收藏'}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloadStatus === 'downloading'}
                  className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-colors relative overflow-hidden ${
                    downloadStatus === 'success'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : downloadStatus === 'error'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {downloadStatus === 'downloading' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      {downloadProgress !== null ? `${downloadProgress}%` : '下载中...'}
                      {/* 进度条背景 */}
                      {downloadProgress !== null && (
                        <div
                          className="absolute bottom-0 left-0 h-1 bg-current opacity-30 transition-all duration-300"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      )}
                    </>
                  ) : downloadStatus === 'success' ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      下载成功
                    </>
                  ) : downloadStatus === 'error' ? (
                    <>
                      <X className="w-5 h-5 mr-2" />
                      下载失败
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      下载
                    </>
                  )}
                </button>
                <button
                  id="copy-link-btn"
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  复制链接
                </button>
              </div>

              {canEdit && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                  <button
                    onClick={openEditModal}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    编辑标签
                  </button>
                  {!image.is_approved && isModerator && (
                    <button
                      onClick={handleApprove}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      审核通过
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {showFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
          >
            <X className="w-8 h-8" />
          </button>
          <SafeImage
            src={image.file_path}
            alt={image.title}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}


      {showEditModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowEditModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                编辑标签
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4" />
                  年份
                </label>
                <select
                  value={editYearId}
                  onChange={(e) => setEditYearId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择年份</option>
                  {years.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Tag className="w-4 h-4" />
                  事件分类
                </label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择分类</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="w-4 h-4" />
                  地点
                </label>
                <select
                  value={editLocationId}
                  onChange={(e) => setEditLocationId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择地点</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveTags}
                disabled={isUpdating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isUpdating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
