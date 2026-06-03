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

// 图片URL验证和错误处理组件
function SafeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);

  // 验证是否为有效的图片URL
  const isValidImageUrl = (url: string): boolean => {
    if (!url) return false;
    // 检查是否是数据URI
    const isDataUri = url.startsWith('data:image/');
    // 检查是否是有效的HTTP(S) URL
    const isValidUrl = url.startsWith('http://') || url.startsWith('https://');
    if (!isValidUrl && !isDataUri) return false;

    // 数据URI直接通过
    if (isDataUri) return true;

    // 排除明显的非图片URL（网页路径）
    const nonImagePatterns = /\.(html|htm|php|asp|jsp|json|xml|txt|js|css)(\?.*)?$/i;
    if (nonImagePatterns.test(url)) return false;

    // 排除以路径结尾的URL（如 /explore, /path）
    // 但保留包含图片扩展名的URL
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico)(\?.*)?$/i.test(url);

    // 如果URL包含图片扩展名，直接通过
    if (hasImageExtension) return true;

    // 对于没有扩展名的URL（如图床链接），尝试加载
    // 只要不是明显的非图片路径就允许
    return true;
  };

  const validSrc = isValidImageUrl(src) ? src : '';

  if (!validSrc || error) {
    return (
      <div className={`${className} bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}>
        <ImageIcon className="w-12 h-12 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={validSrc}
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
  const [showShareModal, setShowShareModal] = useState(false);
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
    
    await supabase
      .from('images')
      .update({ download_count: (image.download_count || 0) + 1 })
      .eq('id', image.id);

    const link = document.createElement('a');
    link.href = image.file_path;
    link.download = image.file_name;
    link.target = '_blank';
    link.click();
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

  function handleShare(platform: string) {
    const url = window.location.href;
    const text = `查看这张图片: ${image?.title}`;
    
    switch (platform) {
      case 'wechat':
        alert('请复制链接分享到微信: ' + url);
        break;
      case 'weibo':
        window.open(`https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`);
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('链接已复制到剪贴板');
        break;
    }
    setShowShareModal(false);
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
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Download className="w-5 h-5 mr-2" />
                  下载
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Share2 className="w-5 h-5 mr-2" />
                  分享
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

      {showShareModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowShareModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              分享图片
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => handleShare('wechat')}
                className="w-full flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
              >
                分享到微信
              </button>
              <button
                onClick={() => handleShare('weibo')}
                className="w-full flex items-center justify-center px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
              >
                分享到微博
              </button>
              <button
                onClick={() => handleShare('copy')}
                className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                复制链接
              </button>
            </div>
          </motion.div>
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
