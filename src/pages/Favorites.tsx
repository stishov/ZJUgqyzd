import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import type { Tables } from '../supabase/types';
import { Heart, Trash2, Image as ImageIcon } from 'lucide-react';

type ImageType = Tables<'images'>;

interface FavoriteWithImage {
  id: string;
  created_at: string;
  image: ImageType;
}

export default function Favorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteWithImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  async function fetchFavorites() {
    setIsLoading(true);
    const { data } = await supabase
      .from('favorites')
      .select('id, created_at, image:images(*)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    if (data) setFavorites(data as any);
    setIsLoading(false);
  }

  async function removeFavorite(favoriteId: string) {
    await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId);
    setFavorites(favorites.filter(f => f.id !== favoriteId));
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            请先登录
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            登录后查看您的收藏
          </p>
          <Link to="/login" className="btn-primary">
            去登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            我的收藏
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            共 {favorites.length} 张收藏图片
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="loading-spinner" />
          </div>
        ) : favorites.length > 0 ? (
          <div className="image-grid">
            {favorites.map((fav, index) => (
              <motion.div
                key={fav.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="image-card aspect-[4/3] group"
              >
                <Link to={`/image/${fav.image.id}`}>
                  <img
                    src={fav.image.thumbnail_path || fav.image.file_path}
                    alt={fav.image.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="image-overlay">
                    <h3 className="text-white font-semibold mb-1 line-clamp-1">
                      {fav.image.title}
                    </h3>
                    <p className="text-white/70 text-sm">
                      收藏于 {new Date(fav.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => removeFavorite(fav.id)}
                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              暂无收藏
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              浏览图库时点击收藏按钮添加图片
            </p>
            <Link to="/gallery" className="btn-primary">
              浏览图库
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}