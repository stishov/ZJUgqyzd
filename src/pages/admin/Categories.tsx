import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import type { Tables } from '../../supabase/types';
import { Plus, Edit2, Trash2, Save, X, FolderOpen, Calendar, MapPin, Tag } from 'lucide-react';

type CategoryType = Tables<'categories'>;
type YearType = Tables<'years'>;
type LocationType = Tables<'locations'>;

type ActiveTab = 'categories' | 'years' | 'locations';

export default function AdminCategories() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('categories');
  
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [years, setYears] = useState<YearType[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [editYear, setEditYear] = useState(0);
  
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newYear, setNewYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  async function fetchData() {
    const [catRes, yearRes, locRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('years').select('*').order('year', { ascending: false }),
      supabase.from('locations').select('*').order('sort_order', { ascending: true }),
    ]);
    
    if (catRes.data) setCategories(catRes.data);
    if (yearRes.data) setYears(yearRes.data);
    if (locRes.data) setLocations(locRes.data);
  }

  function resetForm() {
    setIsEditing(null);
    setIsAdding(false);
    setEditName('');
    setEditDescription('');
    setEditSortOrder(0);
    setEditYear(0);
    setNewName('');
    setNewDescription('');
    setNewYear(new Date().getFullYear());
  }

  function startEditCategory(category: CategoryType) {
    setIsEditing(category.id);
    setEditName(category.name);
    setEditDescription(category.description || '');
    setEditSortOrder(category.sort_order || 0);
  }

  function startEditYear(year: YearType) {
    setIsEditing(year.id);
    setEditYear(year.year);
    setEditDescription(year.description || '');
    setEditSortOrder(year.sort_order || 0);
  }

  function startEditLocation(location: LocationType) {
    setIsEditing(location.id);
    setEditName(location.name);
    setEditDescription(location.description || '');
    setEditSortOrder(location.sort_order || 0);
  }

  async function saveCategory(id: string) {
    await supabase
      .from('categories')
      .update({
        name: editName,
        description: editDescription,
        sort_order: editSortOrder,
      })
      .eq('id', id);
    resetForm();
    fetchData();
  }

  async function saveYear(id: string) {
    await supabase
      .from('years')
      .update({
        year: editYear,
        description: editDescription,
        sort_order: editSortOrder,
      })
      .eq('id', id);
    resetForm();
    fetchData();
  }

  async function saveLocation(id: string) {
    await supabase
      .from('locations')
      .update({
        name: editName,
        description: editDescription,
        sort_order: editSortOrder,
      })
      .eq('id', id);
    resetForm();
    fetchData();
  }

  async function deleteCategory(id: string) {
    if (!confirm('确定要删除这个分类吗？')) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchData();
  }

  async function deleteYear(id: string) {
    if (!confirm('确定要删除这个年份吗？')) return;
    await supabase.from('years').delete().eq('id', id);
    fetchData();
  }

  async function deleteLocation(id: string) {
    if (!confirm('确定要删除这个地点吗？')) return;
    await supabase.from('locations').delete().eq('id', id);
    fetchData();
  }

  async function addCategory() {
    if (!newName.trim()) return;
    await supabase.from('categories').insert({
      name: newName,
      description: newDescription,
      sort_order: categories.length + 1,
    });
    resetForm();
    fetchData();
  }

  async function addYear() {
    if (!newYear) return;
    await supabase.from('years').insert({
      year: newYear,
      description: newDescription,
      sort_order: years.length + 1,
    });
    resetForm();
    fetchData();
  }

  async function addLocation() {
    if (!newName.trim()) return;
    await supabase.from('locations').insert({
      name: newName,
      description: newDescription,
      sort_order: locations.length + 1,
    });
    resetForm();
    fetchData();
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FolderOpen className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            无访问权限
          </h2>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'categories' as const, label: '事件分类', icon: Tag, count: categories.length },
    { id: 'years' as const, label: '年份管理', icon: Calendar, count: years.length },
    { id: 'locations' as const, label: '地点管理', icon: MapPin, count: locations.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            分类管理
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            管理图片的三维度分类：时间、事件、地点
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); resetForm(); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-red-600 border-b-2 border-red-600 bg-red-50 dark:bg-red-900/20'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'categories' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">事件分类</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">管理图片的事件类型分类</p>
                  </div>
                  <button
                    onClick={() => setIsAdding(true)}
                    className="btn-primary flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加分类
                  </button>
                </div>

                {isAdding && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="分类名称"
                        className="form-input"
                      />
                      <input
                        type="text"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="分类描述"
                        className="form-input"
                      />
                      <div className="flex gap-2">
                        <button onClick={addCategory} className="btn-primary flex-1">
                          <Save className="w-4 h-4 mr-1" />
                          保存
                        </button>
                        <button onClick={resetForm} className="btn-secondary">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {categories.map((category) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-4"
                    >
                      {isEditing === category.id ? (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="form-input"
                          />
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="form-input"
                          />
                          <input
                            type="number"
                            value={editSortOrder}
                            onChange={(e) => setEditSortOrder(Number(e.target.value))}
                            className="form-input"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => saveCategory(category.id)} className="btn-primary flex-1">
                              <Save className="w-4 h-4 mr-1" />
                              保存
                            </button>
                            <button onClick={resetForm} className="btn-secondary">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                              <Tag className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {category.name}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {category.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400 mr-4">
                              排序: {category.sort_order}
                            </span>
                            <button
                              onClick={() => startEditCategory(category)}
                              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteCategory(category.id)}
                              className="p-2 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'years' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">年份管理</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">管理图片的时间维度分类（从1997年开始）</p>
                  </div>
                  <button
                    onClick={() => setIsAdding(true)}
                    className="btn-primary flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加年份
                  </button>
                </div>

                {isAdding && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        type="number"
                        value={newYear}
                        onChange={(e) => setNewYear(Number(e.target.value))}
                        placeholder="年份"
                        min="1997"
                        max="2100"
                        className="form-input"
                      />
                      <input
                        type="text"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="年份描述（可选）"
                        className="form-input"
                      />
                      <div className="flex gap-2">
                        <button onClick={addYear} className="btn-primary flex-1">
                          <Save className="w-4 h-4 mr-1" />
                          保存
                        </button>
                        <button onClick={resetForm} className="btn-secondary">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {years.map((year) => (
                    <motion.div
                      key={year.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`relative p-4 rounded-lg border ${
                        isEditing === year.id
                          ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      {isEditing === year.id ? (
                        <div className="space-y-2">
                          <input
                            type="number"
                            value={editYear}
                            onChange={(e) => setEditYear(Number(e.target.value))}
                            className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600"
                          />
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="描述"
                            className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600"
                          />
                          <div className="flex gap-1">
                            <button onClick={() => saveYear(year.id)} className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded">
                              保存
                            </button>
                            <button onClick={resetForm} className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded">
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              {year.year}
                            </div>
                            {year.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                {year.description}
                              </div>
                            )}
                          </div>
                          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditYear(year)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteYear(year.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="absolute top-1 right-1 flex gap-1">
                            <button
                              onClick={() => startEditYear(year)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteYear(year.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'locations' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">地点管理</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">管理图片的地点维度分类</p>
                  </div>
                  <button
                    onClick={() => setIsAdding(true)}
                    className="btn-primary flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加地点
                  </button>
                </div>

                {isAdding && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="地点名称"
                        className="form-input"
                      />
                      <input
                        type="text"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="地点描述"
                        className="form-input"
                      />
                      <div className="flex gap-2">
                        <button onClick={addLocation} className="btn-primary flex-1">
                          <Save className="w-4 h-4 mr-1" />
                          保存
                        </button>
                        <button onClick={resetForm} className="btn-secondary">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {locations.map((location) => (
                    <motion.div
                      key={location.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-lg border ${
                        isEditing === location.id
                          ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      {isEditing === location.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="地点名称"
                            className="w-full form-input"
                          />
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="地点描述"
                            className="w-full form-input"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => saveLocation(location.id)} className="btn-primary flex-1">
                              <Save className="w-4 h-4 mr-1" />
                              保存
                            </button>
                            <button onClick={resetForm} className="btn-secondary">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                              <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {location.name}
                              </h3>
                              {location.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {location.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditLocation(location)}
                              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteLocation(location.id)}
                              className="p-2 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}