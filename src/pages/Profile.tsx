import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import type { Tables } from '../supabase/types';
import {
  User,
  Mail,
  Phone,
  Edit2,
  Save,
  X,
  Camera,
  Image as ImageIcon,
  Heart,
  Download,
  Calendar,
  Trash2,
} from 'lucide-react';

type ProfileType = Tables<'profiles'>;
type ImageType = Tables<'images'>;

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [myImages, setMyImages] = useState<ImageType[]>([]);
  const [myFavorites, setMyFavorites] = useState<(ImageType & { image: ImageType })[]>([]);
  const [activeTab, setActiveTab] = useState<'uploads' | 'favorites'>('uploads');
  const [stats, setStats] = useState({ uploads: 0, favorites: 0, downloads: 0 });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setPhone(profile.phone || '');
    }
    if (user) {
      fetchMyImages();
      fetchMyFavorites();
      fetchStats();
      calculateStorageUsed();
    }
  }, [user, profile]);

  async function fetchMyImages() {
    if (!user) return;
    const { data } = await supabase
      .from('images')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setMyImages(data);
  }

  async function fetchMyFavorites() {
    if (!user) return;
    const { data } = await supabase
      .from('favorites')
      .select('*, image:images(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setMyFavorites(data as any);
  }

  async function fetchStats() {
    if (!user) return;
    const { count: uploads } = await supabase
      .from('images')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: favorites } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { data: downloads } = await supabase
      .from('images')
      .select('download_count')
      .eq('user_id', user.id);

    const totalDownloads = downloads?.reduce((sum, img) => sum + (img.download_count || 0), 0) || 0;

    setStats({
      uploads: uploads || 0,
      favorites: favorites || 0,
      downloads: totalDownloads,
    });
  }

  // 计算用户实际使用的存储空间
  async function calculateStorageUsed() {
    if (!user) return 0;
    const { data } = await supabase
      .from('images')
      .select('file_size')
      .eq('user_id', user.id);

    const totalSize = data?.reduce((sum, img) => sum + (img.file_size || 0), 0) || 0;

    // 更新 profiles 表中的 storage_used
    if (profile) {
      await supabase
        .from('profiles')
        .update({ storage_used: totalSize })
        .eq('id', user.id);
    }

    return totalSize;
  }

  // 撤回待审核的图片
  async function handleWithdrawImage(image: ImageType) {
    if (!confirm('确定要撤回这张待审核的图片吗？撤回后将删除图片和相关数据。')) {
      return;
    }

    try {
      // 1. 删除 Storage 中的文件
      if (image.file_path) {
        const path = image.file_path.split('/').pop();
        if (path) {
          await supabase.storage.from('images').remove([path]);
        }
      }

      // 2. 减少用户的已用存储空间
      if (image.file_size) {
        await supabase.rpc('decrement_storage_used', {
          p_user_id: user!.id,
          p_bytes: image.file_size,
        });
      }

      // 3. 删除 images 表记录
      await supabase.from('images').delete().eq('id', image.id);

      // 4. 刷新列表和统计数据
      fetchMyImages();
      fetchStats();
      calculateStorageUsed();
    } catch (error) {
      console.error('撤回图片失败:', error);
      alert('撤回失败，请重试');
    }
  }

  async function handleSave() {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          bio,
          phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id);

      if (error) throw error;
      await refreshProfile();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function formatStorage(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="bg-gradient-to-r from-red-600 to-red-700 h-32" />
          
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-16 mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-2xl bg-white dark:bg-gray-700 shadow-lg flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-gray-300 dark:text-gray-500" />
                  )}
                </div>
                <button className="absolute bottom-2 right-2 p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                  <Camera className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
              
              <div className="mt-4 sm:mt-0 sm:ml-6 flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile?.display_name || profile?.username}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">@{profile?.username}</p>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="mt-4 sm:mt-0 flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {isEditing ? <X className="w-4 h-4 mr-2" /> : <Edit2 className="w-4 h-4 mr-2" />}
                {isEditing ? '取消' : '编辑资料'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">显示名称</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="form-input"
                        placeholder="请输入显示名称"
                      />
                    </div>
                    <div>
                      <label className="form-label">个人简介</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="form-input min-h-[100px]"
                        placeholder="介绍一下自己..."
                      />
                    </div>
                    <div>
                      <label className="form-label">手机号码</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="form-input"
                        placeholder="请输入手机号码"
                      />
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="btn-primary"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? '保存中...' : '保存修改'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Mail className="w-5 h-5 mr-3" />
                      <span>{profile?.email || '未设置邮箱'}</span>
                    </div>
                    {profile?.phone && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Phone className="w-5 h-5 mr-3" />
                        <span>{profile.phone}</span>
                      </div>
                    )}
                    {profile?.bio && (
                      <p className="text-gray-600 dark:text-gray-400 mt-4">
                        {profile.bio}
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4 mb-4">
                    <button
                      onClick={() => setActiveTab('uploads')}
                      className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'uploads'
                          ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                      }`}
                    >
                      <ImageIcon className="w-5 h-5 mr-2" />
                      我的上传
                    </button>
                    <button
                      onClick={() => setActiveTab('favorites')}
                      className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'favorites'
                          ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Heart className="w-5 h-5 mr-2" />
                      我的收藏
                    </button>
                  </div>

                  {activeTab === 'uploads' ? (
                    myImages.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {myImages.map((img) => (
                          <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden">
                            <a
                              href={`/#/image/${img.id}`}
                              className="block w-full h-full"
                            >
                              <img
                                src={img.thumbnail_path || img.file_path}
                                alt={img.title}
                                className="w-full h-full object-cover"
                              />
                            </a>

                            {/* 待审核标记 */}
                            {!img.is_approved && (
                              <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs rounded font-medium">
                                待审核
                              </div>
                            )}

                            {/* 撤回按钮 - 仅对待审核图片显示 */}
                            {!img.is_approved && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleWithdrawImage(img);
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                title="撤回图片"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>暂无上传的图片</p>
                      </div>
                    )
                  ) : (
                    myFavorites.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {myFavorites.map((fav) => (
                          <a
                            key={fav.id}
                            href={`/#/image/${fav.image.id}`}
                            className="aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={fav.image.thumbnail_path || fav.image.file_path}
                              alt={fav.image.title}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>暂无收藏的图片</p>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">统计数据</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        上传图片
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">{stats.uploads}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center">
                        <Heart className="w-4 h-4 mr-2" />
                        收藏图片
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">{stats.favorites}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center">
                        <Download className="w-4 h-4 mr-2" />
                        下载次数
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">{stats.downloads}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">存储空间</h3>
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">已使用</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatStorage(profile?.storage_used || 0)} / {formatStorage(profile?.storage_limit || 0)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-600 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((profile?.storage_used || 0) / (profile?.storage_limit || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">账号信息</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>注册于 {new Date(profile?.created_at || '').toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}