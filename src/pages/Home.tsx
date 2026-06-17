import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import type { Tables } from '../supabase/types';
import {
  Image as ImageIcon,
  Upload,
  Users,
  TrendingUp,
  ArrowRight,
  Heart,
  Calendar,
  MapPin,
  Tag,
} from 'lucide-react';

type ImageType = Tables<'images'>;
type CategoryType = Tables<'categories'>;
type YearType = Tables<'years'>;
type LocationType = Tables<'locations'>;

export default function Home() {
  const { user } = useAuth();
  const [featuredImages, setFeaturedImages] = useState<ImageType[]>([]);
  const [backgroundImages, setBackgroundImages] = useState<ImageType[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [years, setYears] = useState<YearType[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [stats, setStats] = useState({
    totalImages: 0,
    totalUsers: 0,
    totalDownloads: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      // 获取精选图片用于前景展示
      const { data: images } = await supabase
        .from('images')
        .select('*')
        .eq('is_featured', true)
        .eq('is_approved', true)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (images) setFeaturedImages(images);

      // 获取更多图片用于背景轮播（最多30张）
      const { data: bgImages } = await supabase
        .from('images')
        .select('*')
        .eq('is_approved', true)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(30);

      if (bgImages) setBackgroundImages(bgImages);

      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (cats) setCategories(cats);

      const { data: yearData } = await supabase
        .from('years')
        .select('*')
        .order('year', { ascending: false })
        .limit(8);

      if (yearData) setYears(yearData);

      const { data: locData } = await supabase
        .from('locations')
        .select('*')
        .order('sort_order', { ascending: true });

      if (locData) setLocations(locData);

      const { count: imageCount } = await supabase
        .from('images')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true)
        .eq('is_public', true);

      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { data: downloadData } = await supabase
        .from('images')
        .select('download_count')
        .eq('is_approved', true);

      const totalDownloads = downloadData?.reduce((sum, img) => sum + (img.download_count || 0), 0) || 0;

      setStats({
        totalImages: imageCount || 0,
        totalUsers: userCount || 0,
        totalDownloads,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <section className="relative bg-gradient-to-br from-red-700 via-red-600 to-red-800 text-white py-20 lg:py-32 overflow-hidden">
        {/* 背景图片横向轮播层 */}
        {backgroundImages.length > 0 && (() => {
          // 根据图片数量决定行数：少于10张显示1行，否则显示2行
          const rows = backgroundImages.length < 10 ? 1 : 2;
          const imagesPerRow = Math.ceil(backgroundImages.length / rows);
          const displayImages = backgroundImages.slice(0, imagesPerRow * rows);

          return (
            <div className="absolute inset-0 overflow-hidden">
              <div className="h-full flex flex-col justify-center gap-2 py-4">
                {[...Array(rows)].map((_, rowIndex) => {
                  const rowStart = rowIndex * imagesPerRow;
                  const rowImages = displayImages.slice(rowStart, rowStart + imagesPerRow);
                  
                  return (
                    <div key={rowIndex} className="flex animate-scroll-horizontal">
                      {/* 重复两次以实现无缝循环（第一组 + 第二组作为缓冲） */}
                      {[...Array(2)].map((_, repeatIndex) => (
                        <div key={repeatIndex} className="flex gap-2 flex-shrink-0">
                          {rowImages.map((image, index) => (
                            <div
                              key={`${repeatIndex}-${index}`}
                              className="flex-shrink-0 w-48 h-36 rounded-lg overflow-hidden"
                            >
                              <img
                                src={image.thumbnail_path || image.file_path}
                                alt=""
                                className="w-full h-full object-cover opacity-40"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              
              {/* CSS 动画定义 - 使用固定像素值确保无缝循环 */}
              <style>{`
                @keyframes scroll-horizontal {
                  0% {
                    transform: translateX(0);
                  }
                  100% {
                    transform: translateX(-50%);
                  }
                }
                .animate-scroll-horizontal {
                  animation: scroll-horizontal 20s linear infinite;
                  will-change: transform;
                }
              `}</style>
            </div>
          );
        })()}

        {/* 渐变遮罩层，确保文字可读性 */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/70 via-red-800/50 to-red-900/70" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              浙江大学国旗仪仗队
            </h1>
            <p className="text-xl sm:text-2xl text-red-100 mb-4">
              图片存储与展示平台
            </p>
            <p className="text-lg text-red-200 mb-10 max-w-2xl mx-auto">
              记录每一次升旗的庄严时刻，保存每一份训练的汗水与荣耀
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-8 text-center"
            >
              <div className="w-14 h-14 bg-red-100 dark:bg-red-800/50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {stats.totalImages.toLocaleString()}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">精选图片</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8 text-center"
            >
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-800/50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {stats.totalUsers.toLocaleString()}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">注册用户</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-8 text-center"
            >
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-800/50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {stats.totalDownloads.toLocaleString()}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">下载次数</p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              三维度分类浏览
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              按时间、事件、地点三个维度探索我们的图片库
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">时间维度</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                按年份浏览，从1997年队史开始
              </p>
              <div className="flex flex-wrap gap-2">
                {years.slice(0, 6).map((year) => (
                  <Link
                    key={year.id}
                    to={`/gallery?year=${year.id}`}
                    className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg text-sm hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                  >
                    {year.year}
                  </Link>
                ))}
                {years.length > 6 && (
                  <Link
                    to="/gallery"
                    className="px-3 py-1.5 text-purple-600 dark:text-purple-400 text-sm hover:underline"
                  >
                    更多...
                  </Link>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <Tag className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">事件维度</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                按活动类型分类浏览
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/gallery/${category.id}`}
                    className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">地点维度</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                按校区和活动地点浏览
              </p>
              <div className="flex flex-wrap gap-2">
                {locations.map((location) => (
                  <Link
                    key={location.id}
                    to={`/gallery?location=${location.id}`}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    {location.name}
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                精选图片
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                编辑推荐的优质图片
              </p>
            </div>
            <Link
              to="/gallery"
              className="inline-flex items-center text-red-600 hover:text-red-700 font-medium"
            >
              查看全部
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="loading-spinner" />
            </div>
          ) : featuredImages.length > 0 ? (
            <div className="image-grid">
              {featuredImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="image-card aspect-[4/3]"
                >
                  <Link to={`/image/${image.id}`}>
                    <img
                      src={image.thumbnail_path || image.file_path}
                      alt={image.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="image-overlay">
                      <h3 className="text-white font-semibold mb-1">
                        {image.title}
                      </h3>
                      <div className="flex items-center text-white/80 text-sm">
                        <Heart className="w-4 h-4 mr-1" />
                        <span>{image.view_count || 0} 次浏览</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                暂无精选图片
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
