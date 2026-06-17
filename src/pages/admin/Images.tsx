import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import type { Tables } from '../../supabase/types';
import {
  Search,
  Check,
  X,
  Trash2,
  AlertCircle,
  Filter,
  Image as ImageIcon,
  Eye,
  Tag,
  Copy,
  Database,
} from 'lucide-react';

type ImageType = Tables<'images'>;

interface ImageWithProfile extends ImageType {
  profile?: { username: string; display_name: string };
  category?: { name: string };
  year?: { year: number };
  location?: { name: string };
}

export default function AdminImages() {
  const { isModerator } = useAuth();
  const [images, setImages] = useState<ImageWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isModerator) {
      fetchImages();
    }
  }, [isModerator, filterStatus]);

  async function fetchImages() {
    setIsLoading(true);
    let query = supabase
      .from('images')
      .select('*, profile:profiles(username, display_name), category:categories(name), year:years(year), location:locations(name)')
      .order('created_at', { ascending: false });

    if (filterStatus === 'pending') {
      query = query.eq('is_approved', false);
    } else if (filterStatus === 'approved') {
      query = query.eq('is_approved', true);
    }

    const { data } = await query;
    if (data) setImages(data as ImageWithProfile[]);
    setIsLoading(false);
  }

  async function approveImage(imageId: string) {
    await supabase
      .from('images')
      .update({ is_approved: true })
      .eq('id', imageId);
    fetchImages();
  }

  async function deleteImage(image: ImageWithProfile) {
    if (!confirm('确定要删除这张图片吗？')) return;

    if (image.file_path) {
      const path = image.file_path.split('/').pop();
      if (path) {
        await supabase.storage.from('images').remove([path]);
      }
    }

    // 减少用户的已用存储空间
    if (image.user_id && image.file_size) {
      await supabase.rpc('decrement_storage_used', {
        p_user_id: image.user_id,
        p_bytes: image.file_size,
      });
    }

    await supabase.from('images').delete().eq('id', image.id);
    fetchImages();
  }

  const filteredImages = images.filter(
    (img) =>
      img.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      img.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isModerator) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            无访问权限
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            图片管理
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            审核和管理所有图片
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索图片..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                <option value="all">全部</option>
                <option value="pending">待审核</option>
                <option value="approved">已审核</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredImages.map((image) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden"
              >
                <div className="aspect-video relative">
                  <img
                    src={image.thumbnail_path || image.file_path}
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />
                  {!image.is_approved && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded">
                      待审核
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1 truncate">
                    {image.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    上传者: {image.profile?.display_name || image.profile?.username}
                  </p>

                  {/* 分类信息展示 */}
                  <div className="mb-3">
                    {image.category || image.year || image.location ? (
                      <div className="flex flex-wrap gap-1">
                        {image.year && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                            {image.year.year}年
                          </span>
                        )}
                        {image.category && (
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
                            {image.category.name}
                          </span>
                        )}
                        {image.location && (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                            {image.location.name}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs">
                        <Tag className="w-3 h-3" />
                        <span>未分类（请先编辑标签）</span>
                      </div>
                    )}
                  </div>

                  {/* 存储路径信息 */}
                  <div className="mb-3 px-2 py-1.5 bg-gray-100 dark:bg-gray-600/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <Database className="w-3 h-3" />
                      <span className="font-medium">Meoo Cloud Storage</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={image.file_path}
                        readOnly
                        className="flex-1 text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-400 truncate"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(image.file_path);
                          alert('链接已复制到剪贴板');
                        }}
                        className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                        title="复制链接"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <span className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {image.view_count || 0}
                    </span>
                    <span>{new Date(image.created_at || '').toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    {!image.is_approved && (
                      <button
                        onClick={() => approveImage(image.id)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        通过
                      </button>
                    )}
                    <a
                      href={`/#/image/${image.id}`}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm"
                    >
                      查看
                    </a>
                    <button
                      onClick={() => deleteImage(image)}
                      className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredImages.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">没有找到图片</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}