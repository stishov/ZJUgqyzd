import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  Tags,
} from 'lucide-react';

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalImages: 0,
    pendingImages: 0,
    totalDownloads: 0,
  });
  const [recentImages, setRecentImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchRecentImages();
    }
  }, [isAdmin]);

  async function fetchStats() {
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { count: totalImages } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true });

    const { count: pendingImages } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', false);

    const { data: downloads } = await supabase
      .from('images')
      .select('download_count');

    const totalDownloads = downloads?.reduce((sum, img) => sum + (img.download_count || 0), 0) || 0;

    setStats({
      totalUsers: totalUsers || 0,
      totalImages: totalImages || 0,
      pendingImages: pendingImages || 0,
      totalDownloads,
    });
    setIsLoading(false);
  }

  async function fetchRecentImages() {
    const { data } = await supabase
      .from('images')
      .select('*, profile:profiles(username, display_name)')
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setRecentImages(data);
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            无访问权限
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            您没有管理员权限
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            管理后台
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            系统概览和数据统计
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalUsers}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">注册用户</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalImages}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">图片总数</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.pendingImages}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">待审核</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalDownloads.toLocaleString()}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">下载次数</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  最近上传
                </h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentImages.map((image) => (
                  <div key={image.id} className="p-4 flex items-center gap-4">
                    <img
                      src={image.thumbnail_path || image.file_path}
                      alt={image.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {image.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {image.profile?.display_name || image.profile?.username}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {image.is_approved ? (
                        <span className="flex items-center text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          已审核
                        </span>
                      ) : (
                        <span className="flex items-center text-yellow-600 text-sm">
                          <Clock className="w-4 h-4 mr-1" />
                          待审核
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <Link
                  to="/admin/images"
                  className="flex items-center justify-center text-red-600 hover:text-red-700 font-medium"
                >
                  查看全部
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                快捷操作
              </h2>
              <div className="space-y-3">
                <Link
                  to="/admin/users"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Users className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">用户管理</span>
                  <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
                </Link>
                <Link
                  to="/admin/images"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <ImageIcon className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">图片管理</span>
                  <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
                </Link>
                <Link
                  to="/admin/categories"
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Tags className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">分类管理</span>
                  <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}