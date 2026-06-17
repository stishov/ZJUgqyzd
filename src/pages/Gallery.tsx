import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import type { Tables } from '../supabase/types';
import {
  Search,
  Filter,
  Grid3X3,
  LayoutList,
  Heart,
  Download,
  Eye,
  ChevronDown,
  X,
  Image as ImageIcon,
  Calendar,
  MapPin,
  Tag,
  Share2,
  Check,
} from 'lucide-react';

// 图片展示组件 - 仅支持 Meoo Cloud Storage
function SafeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`${className} bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}>
        <ImageIcon className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
}

type ImageType = Tables<'images'>;
type CategoryType = Tables<'categories'>;
type YearType = Tables<'years'>;
type LocationType = Tables<'locations'>;
type ProfileType = Tables<'profiles'>;

interface ImageWithProfile extends ImageType {
  profile?: ProfileType;
}

export default function Gallery() {
  const { user } = useAuth();
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [images, setImages] = useState<ImageWithProfile[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [years, setYears] = useState<YearType[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(category || null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [copiedImageId, setCopiedImageId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    fetchCategories();
    fetchYears();
    fetchLocations();
    fetchFavorites();

    const yearParam = searchParams.get('year');
    const locationParam = searchParams.get('location');
    if (yearParam) setSelectedYear(yearParam);
    if (locationParam) setSelectedLocation(locationParam);
  }, []);

  useEffect(() => {
    setPage(1);
    setImages([]);
    fetchImages(true);
  }, [selectedCategory, selectedYear, selectedLocation, searchQuery, sortBy]);

  useEffect(() => {
    if (page > 1) {
      fetchImages(false);
    }
  }, [page]);

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

  async function fetchFavorites() {
    if (!user) return;
    const { data } = await supabase
      .from('favorites')
      .select('image_id')
      .eq('user_id', user.id);
    if (data) {
      setFavorites(new Set(data.map(f => f.image_id)));
    }
  }

  async function fetchImages(reset: boolean) {
    setIsLoading(true);
    try {
      let query = supabase
        .from('images')
        .select('*, profile:profiles(username, display_name, avatar_url)')
        .eq('is_approved', true)
        .eq('is_public', true);

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      if (selectedYear) {
        query = query.eq('year_id', selectedYear);
      }

      if (selectedLocation) {
        query = query.eq('location_id', selectedLocation);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`);
      }

      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'popular') {
        query = query.order('view_count', { ascending: false });
      }

      const start = (page - 1) * ITEMS_PER_PAGE;
      query = query.range(start, start + ITEMS_PER_PAGE - 1);

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        if (reset) {
          setImages(data as ImageWithProfile[]);
        } else {
          setImages(prev => [...prev, ...(data as ImageWithProfile[])]);
        }
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleFavorite(imageId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    if (favorites.has(imageId)) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('image_id', imageId);
      setFavorites(prev => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, image_id: imageId });
      setFavorites(prev => new Set([...prev, imageId]));
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery) {
      setSearchParams({ q: searchQuery });
    } else {
      setSearchParams({});
    }
  }

  function clearAllFilters() {
    setSelectedCategory(null);
    setSelectedYear(null);
    setSelectedLocation(null);
    setSearchQuery('');
    setSearchParams({});
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async function handleCopyLink(imageId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/#/image/${imageId}`);
      setCopiedImageId(imageId);
      setTimeout(() => setCopiedImageId(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  }

  const hasActiveFilters = selectedCategory || selectedYear || selectedLocation || searchQuery;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            图片库
          </h1>

          <div className="flex flex-col lg:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索图片标题、描述或标签..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </form>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-4 py-3 rounded-xl border transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800'
                    : 'bg-white border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
                }`}
              >
                <Filter className="w-5 h-5 mr-2" />
                筛选
                {hasActiveFilters && (
                  <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
                    {[selectedCategory, selectedYear, selectedLocation, searchQuery].filter(Boolean).length}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <LayoutList className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-red-600" />
                      <h3 className="font-medium text-gray-900 dark:text-white">时间维度</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedYear(null)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          !selectedYear
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        全部年份
                      </button>
                      {years.slice(0, 8).map((year) => (
                        <button
                          key={year.id}
                          onClick={() => setSelectedYear(year.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            selectedYear === year.id
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {year.year}
                        </button>
                      ))}
                      {years.length > 8 && (
                        <select
                          value={selectedYear || ''}
                          onChange={(e) => setSelectedYear(e.target.value || null)}
                          className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-none focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">更多年份</option>
                          {years.slice(8).map((year) => (
                            <option key={year.id} value={year.id}>
                              {year.year}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4 text-red-600" />
                      <h3 className="font-medium text-gray-900 dark:text-white">事件维度</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          !selectedCategory
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        全部事件
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            selectedCategory === cat.id
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-red-600" />
                      <h3 className="font-medium text-gray-900 dark:text-white">地点维度</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedLocation(null)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          !selectedLocation
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        全部地点
                      </button>
                      {locations.map((loc) => (
                        <button
                          key={loc.id}
                          onClick={() => setSelectedLocation(loc.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            selectedLocation === loc.id
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {loc.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">排序:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="newest">最新上传</option>
                      <option value="oldest">最早上传</option>
                      <option value="popular">最受欢迎</option>
                    </select>
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                      清除所有筛选
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {hasActiveFilters && !showFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">当前筛选:</span>
              {selectedYear && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm">
                  <Calendar className="w-3 h-3" />
                  {years.find(y => y.id === selectedYear)?.year}
                  <button onClick={() => setSelectedYear(null)} className="ml-1 hover:text-red-900 dark:hover:text-red-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm">
                  <Tag className="w-3 h-3" />
                  {categories.find(c => c.id === selectedCategory)?.name}
                  <button onClick={() => setSelectedCategory(null)} className="ml-1 hover:text-red-900 dark:hover:text-red-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedLocation && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm">
                  <MapPin className="w-3 h-3" />
                  {locations.find(l => l.id === selectedLocation)?.name}
                  <button onClick={() => setSelectedLocation(null)} className="ml-1 hover:text-red-900 dark:hover:text-red-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm">
                  <Search className="w-3 h-3" />
                  {searchQuery}
                  <button onClick={() => { setSearchQuery(''); setSearchParams({}); }} className="ml-1 hover:text-red-900 dark:hover:text-red-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {isLoading && images.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="loading-spinner" />
          </div>
        ) : images.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className="image-grid">
                {images.map((image, index) => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="image-card aspect-[4/3] group"
                  >
                    <Link to={`/image/${image.id}`}>
                      <SafeImage
                        src={image.thumbnail_path || image.file_path}
                        alt={image.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="image-overlay">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white font-semibold mb-1 line-clamp-1">
                              {image.title}
                            </h3>
                            <p className="text-white/70 text-sm">
                              {image.profile?.display_name || image.profile?.username}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {user && (
                              <button
                                onClick={(e) => toggleFavorite(image.id, e)}
                                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                              >
                                <Heart
                                  className={`w-5 h-5 ${
                                    favorites.has(image.id)
                                      ? 'fill-red-500 text-red-500'
                                      : 'text-white'
                                  }`}
                                />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleCopyLink(image.id, e)}
                              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                              title="复制链接"
                            >
                              {copiedImageId === image.id ? (
                                <Check className="w-5 h-5 text-green-400" />
                              ) : (
                                <Share2 className="w-5 h-5 text-white" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-white/60 text-sm">
                          <span className="flex items-center">
                            <Eye className="w-4 h-4 mr-1" />
                            {image.view_count || 0}
                          </span>
                          <span className="flex items-center">
                            <Download className="w-4 h-4 mr-1" />
                            {image.download_count || 0}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {images.map((image, index) => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 flex gap-4 hover:shadow-md transition-shadow"
                  >
                    <Link to={`/image/${image.id}`} className="w-48 h-32 flex-shrink-0">
                      <SafeImage
                        src={image.thumbnail_path || image.file_path}
                        alt={image.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/image/${image.id}`}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 hover:text-red-600 dark:hover:text-red-400">
                          {image.title}
                        </h3>
                      </Link>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2">
                        {image.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                        <span>{image.profile?.display_name || image.profile?.username}</span>
                        <span>{new Date(image.created_at || '').toLocaleDateString()}</span>
                        <span>{formatFileSize(image.file_size)}</span>
                        <span className="flex items-center">
                          <Eye className="w-4 h-4 mr-1" />
                          {image.view_count || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user && (
                        <button
                          onClick={(e) => toggleFavorite(image.id, e)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Heart
                            className={`w-5 h-5 ${
                              favorites.has(image.id)
                                ? 'fill-red-500 text-red-500'
                                : 'text-gray-400'
                            }`}
                          />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleCopyLink(image.id, e)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="复制链接"
                      >
                        {copiedImageId === image.id ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <Share2 className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={isLoading}
                  className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? '加载中...' : '加载更多'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
              没有找到图片
            </p>
            <p className="text-gray-400 dark:text-gray-500">
              尝试调整搜索条件或筛选条件
            </p>
          </div>
        )}
      </div>
    </div>
  );
}