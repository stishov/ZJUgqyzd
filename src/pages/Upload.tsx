import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import type { Tables } from '../supabase/types';
import {
  Upload as UploadIcon,
  X,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Loader,
  Tag,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Globe,
} from 'lucide-react';

type CategoryType = Tables<'categories'>;
type YearType = Tables<'years'>;
type LocationType = Tables<'locations'>;

interface UploadFile {
  file: File;
  preview: string;
  title: string;
  description: string;
  category: string;
  year: string;
  location: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface ImportUrl {
  url: string;
  title: string;
  description: string;
  category: string;
  year: string;
  location: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
  preview?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  fileName?: string;
  mimeType?: string;
}

type UploadMode = 'upload' | 'import';

export default function UploadPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<UploadMode>('upload');
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [years, setYears] = useState<YearType[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [importUrls, setImportUrls] = useState<ImportUrl[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [maxSize, setMaxSize] = useState(10 * 1024 * 1024);
  const [allowedFormats, setAllowedFormats] = useState<string[]>([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ]);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
    fetchYears();
    fetchLocations();
  }, []);

  async function fetchSettings() {
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .in('key', ['max_upload_size', 'allowed_formats']);
    if (data) {
      data.forEach((setting) => {
        if (setting.key === 'max_upload_size') {
          setMaxSize(Number(setting.value));
        } else if (setting.key === 'allowed_formats') {
          const value = String(setting.value);
          try {
            const parsed = JSON.parse(value);
            setAllowedFormats(Array.isArray(parsed) ? parsed : [parsed]);
          } catch {
            setAllowedFormats(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
          }
        }
      });
    }
  }

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

  // 本地上传相关函数
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  }

  function handleFiles(files: File[]) {
    files.forEach((file) => {
      if (!allowedFormats.includes(file.type)) {
        return;
      }
      if (file.size > maxSize) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        const uploadFile: UploadFile = {
          file,
          preview,
          title: file.name.replace(/\.[^/.]+$/, ''),
          description: '',
          category: '',
          year: '',
          location: '',
          status: 'pending',
          progress: 0,
        };
        setUploadFiles((prev) => [...prev, uploadFile]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeFile(index: number) {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function updateFile(index: number, updates: Partial<UploadFile>) {
    setUploadFiles((prev) =>
      prev.map((file, i) => (i === index ? { ...file, ...updates } : file))
    );
  }

  // 图床导入相关函数
  function handleUrlInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setUrlInput(e.target.value);
  }

  function parseUrls(input: string): string[] {
    // 支持多种分隔符：换行、逗号、空格
    return input
      .split(/[\n,\s]+/)
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith('http'));
  }

  function detectSourceType(url: string): string {
    if (url.includes('github')) return 'github_pages';
    if (url.includes('imgur')) return 'imgur';
    if (url.includes('sm.ms')) return 'smms';
    if (url.includes('alicdn') || url.includes('taobao')) return 'alicdn';
    if (url.includes('qpic') || url.includes('weixin')) return 'wechat';
    if (url.includes('qq')) return 'qq';
    if (url.includes('sinaimg')) return 'sina';
    return 'external';
  }

  async function addUrls() {
    const urls = parseUrls(urlInput);
    if (urls.length === 0) {
      alert('请输入有效的图片URL');
      return;
    }

    const newImports: ImportUrl[] = urls.map(url => ({
      url,
      title: '',
      description: '',
      category: '',
      year: '',
      location: '',
      status: 'pending',
    }));

    setImportUrls(prev => [...prev, ...newImports]);
    setUrlInput('');

    // 自动开始获取图片信息
    for (let i = importUrls.length; i < importUrls.length + newImports.length; i++) {
      await fetchImageInfo(i);
    }
  }

  async function fetchImageInfo(index: number) {
    const importItem = importUrls[index];
    if (!importItem) return;

    updateImportUrl(index, { status: 'loading' });

    try {
      // 使用 fetch 获取图片信息
      const response = await fetch(importItem.url, { 
        method: 'HEAD',
        mode: 'no-cors',
      });
      
      // 由于跨域限制，我们无法直接获取文件大小
      // 尝试加载图片获取尺寸
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('无法加载图片'));
        img.src = importItem.url;
      });

      // 从URL提取文件名
      const urlParts = importItem.url.split('/');
      const fileName = urlParts[urlParts.length - 1] || 'unknown.jpg';
      const title = fileName.replace(/\.[^/.]+$/, '');

      updateImportUrl(index, {
        status: 'pending',
        preview: importItem.url,
        width: img.naturalWidth,
        height: img.naturalHeight,
        fileName,
        title,
        mimeType: `image/${fileName.split('.').pop() || 'jpeg'}`,
      });
    } catch (error) {
      updateImportUrl(index, {
        status: 'error',
        error: '无法访问该图片URL，请检查链接是否有效',
      });
    }
  }

  function removeImportUrl(index: number) {
    setImportUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function updateImportUrl(index: number, updates: Partial<ImportUrl>) {
    setImportUrls((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  }

  function generateTags(item: { year: string; category: string; location: string }): string[] {
    const tags: string[] = [];
    
    if (item.year) {
      const yearData = years.find(y => y.id === item.year);
      if (yearData) tags.push(`${yearData.year}年`);
    }
    
    if (item.category) {
      const catData = categories.find(c => c.id === item.category);
      if (catData) tags.push(catData.name);
    }
    
    if (item.location) {
      const locData = locations.find(l => l.id === item.location);
      if (locData) tags.push(locData.name);
    }
    
    return tags;
  }

  // 上传单个文件
  async function uploadSingleFile(uploadFile: UploadFile, index: number) {
    if (!user) return;

    updateFile(index, { status: 'uploading', progress: 0 });

    try {
      const fileExt = uploadFile.file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = (e.target?.result as string).split(',')[1];
          const { decode } = await import('base64-arraybuffer');
          const arrayBuffer = decode(base64);

          updateFile(index, { progress: 30 });

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('images')
            .upload(fileName, arrayBuffer, {
              contentType: uploadFile.file.type,
            });

          if (uploadError) throw uploadError;

          updateFile(index, { progress: 60 });

          const { data: urlData } = supabase.storage
            .from('images')
            .getPublicUrl(uploadData.path);

          const imageUrl = urlData.publicUrl;

          const img = new window.Image();
          img.src = uploadFile.preview;
          await new Promise((resolve) => {
            img.onload = resolve;
          });

          const autoTags = generateTags(uploadFile);

          const { error: dbError } = await supabase.from('images').insert({
            user_id: user.id,
            title: uploadFile.title,
            description: uploadFile.description,
            file_name: uploadFile.file.name,
            file_path: imageUrl,
            file_size: uploadFile.file.size,
            mime_type: uploadFile.file.type,
            width: img.naturalWidth,
            height: img.naturalHeight,
            thumbnail_path: imageUrl,
            category_id: uploadFile.category || null,
            year_id: uploadFile.year || null,
            location_id: uploadFile.location || null,
            tags: autoTags.length > 0 ? autoTags : null,
            is_public: true,
            is_approved: false,
            source_type: 'supabase_storage',
          });

          if (dbError) throw dbError;

          updateFile(index, { status: 'success', progress: 100 });
        } catch (error: any) {
          updateFile(index, {
            status: 'error',
            error: error.message || '上传失败',
          });
        }
      };
      reader.readAsDataURL(uploadFile.file);
    } catch (error: any) {
      updateFile(index, {
        status: 'error',
        error: error.message || '上传失败',
      });
    }
  }

  // 导入单个URL
  async function importSingleUrl(importItem: ImportUrl, index: number) {
    if (!user) return;

    updateImportUrl(index, { status: 'loading' });

    try {
      const autoTags = generateTags(importItem);
      const sourceType = detectSourceType(importItem.url);

      const { error: dbError } = await supabase.from('images').insert({
        user_id: user.id,
        title: importItem.title || importItem.fileName || '未命名图片',
        description: importItem.description,
        file_name: importItem.fileName || 'unknown.jpg',
        file_path: importItem.url,
        file_size: importItem.fileSize || 0,
        mime_type: importItem.mimeType || 'image/jpeg',
        width: importItem.width,
        height: importItem.height,
        thumbnail_path: importItem.url,
        category_id: importItem.category || null,
        year_id: importItem.year || null,
        location_id: importItem.location || null,
        tags: autoTags.length > 0 ? autoTags : null,
        is_public: true,
        is_approved: false,
        source_type: sourceType,
      });

      if (dbError) throw dbError;

      updateImportUrl(index, { status: 'success' });
    } catch (error: any) {
      updateImportUrl(index, {
        status: 'error',
        error: error.message || '导入失败',
      });
    }
  }

  async function uploadAll() {
    for (let i = 0; i < uploadFiles.length; i++) {
      if (uploadFiles[i].status === 'pending') {
        await uploadSingleFile(uploadFiles[i], i);
      }
    }
  }

  async function importAll() {
    for (let i = 0; i < importUrls.length; i++) {
      if (importUrls[i].status === 'pending') {
        await importSingleUrl(importUrls[i], i);
      }
    }
  }

  function formatSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <UploadIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            请先登录
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            登录后上传图片
          </p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            去登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            添加图片
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            支持本地上传或从图床导入
          </p>
        </div>

        {/* 模式切换选项卡 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setUploadMode('upload')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
              uploadMode === 'upload'
                ? 'bg-red-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <UploadIcon className="w-5 h-5" />
            本地上传
          </button>
          <button
            onClick={() => setUploadMode('import')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
              uploadMode === 'import'
                ? 'bg-red-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Globe className="w-5 h-5" />
            从图床导入
          </button>
        </div>

        <AnimatePresence mode="wait">
          {uploadMode === 'upload' ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* 本地上传区域 */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-red-400 dark:hover:border-red-500'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={allowedFormats.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <UploadIcon
                  className={`w-16 h-16 mx-auto mb-4 ${
                    isDragging ? 'text-red-500' : 'text-gray-400'
                  }`}
                />
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  拖拽图片到这里，或点击选择文件
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  支持 JPEG、PNG、GIF、WebP 格式，单文件最大 {formatSize(maxSize)}
                </p>
              </div>

              {/* 本地上传文件列表 */}
              {uploadFiles.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      待上传 ({uploadFiles.length})
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setUploadFiles([])}
                        className="btn-secondary"
                      >
                        清空全部
                      </button>
                      <button
                        onClick={uploadAll}
                        disabled={uploadFiles.every((f) => f.status !== 'pending')}
                        className="btn-primary"
                      >
                        全部上传
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {uploadFiles.map((file, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex gap-4">
                          <div className="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={file.preview}
                              alt={file.title}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <input
                                type="text"
                                value={file.title}
                                onChange={(e) =>
                                  updateFile(index, { title: e.target.value })
                                }
                                className="text-lg font-medium text-gray-900 dark:text-white bg-transparent border-none focus:outline-none w-full"
                                placeholder="图片标题"
                              />
                              <button
                                onClick={() => removeFile(index)}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                              <div>
                                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <Calendar className="w-3 h-3" />
                                  年份
                                </label>
                                <select
                                  value={file.year}
                                  onChange={(e) =>
                                    updateFile(index, { year: e.target.value })
                                  }
                                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none"
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
                                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <Tag className="w-3 h-3" />
                                  事件分类
                                </label>
                                <select
                                  value={file.category}
                                  onChange={(e) =>
                                    updateFile(index, { category: e.target.value })
                                  }
                                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none"
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
                                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <MapPin className="w-3 h-3" />
                                  地点
                                </label>
                                <select
                                  value={file.location}
                                  onChange={(e) =>
                                    updateFile(index, { location: e.target.value })
                                  }
                                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none"
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

                            <div className="mb-3 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                              <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 mb-1">
                                <Tag className="w-3 h-3" />
                                自动生成标签
                              </div>
                              <p className="text-sm text-purple-700 dark:text-purple-300">
                                {generateTags(file).join(' · ') || '选择分类后将自动生成'}
                              </p>
                            </div>

                            <textarea
                              value={file.description}
                              onChange={(e) =>
                                updateFile(index, { description: e.target.value })
                              }
                              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none resize-none"
                              rows={2}
                              placeholder="图片描述..."
                            />

                            <div className="flex items-center justify-between mt-3">
                              <span className="text-sm text-gray-500">
                                {formatSize(file.file.size)}
                              </span>

                              {file.status === 'pending' && (
                                <button
                                  onClick={() => uploadSingleFile(file, index)}
                                  className="btn-primary text-sm py-1 px-3"
                                >
                                  上传
                                </button>
                              )}
                              {file.status === 'uploading' && (
                                <div className="flex items-center text-blue-600">
                                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                                  <span className="text-sm">{file.progress}%</span>
                                </div>
                              )}
                              {file.status === 'success' && (
                                <div className="flex items-center text-green-600">
                                  <Check className="w-4 h-4 mr-2" />
                                  <span className="text-sm">上传成功</span>
                                </div>
                              )}
                              {file.status === 'error' && (
                                <div className="flex items-center text-red-600">
                                  <AlertCircle className="w-4 h-4 mr-2" />
                                  <span className="text-sm">{file.error}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="import"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* 图床导入区域 */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <LinkIcon className="w-5 h-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    从图床导入
                  </h2>
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  支持 GitHub Pages、SM.MS、Imgur 等图床的图片链接。每行一个URL，支持批量导入。
                </p>

                <textarea
                  value={urlInput}
                  onChange={handleUrlInputChange}
                  placeholder="粘贴图片URL，每行一个...&#10;例如：&#10;https://example.com/image1.jpg&#10;https://example.com/image2.png"
                  className="w-full h-32 px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
                />

                <div className="flex gap-2">
                  <button
                    onClick={addUrls}
                    disabled={!urlInput.trim()}
                    className="btn-primary"
                  >
                    添加URL
                  </button>
                  <button
                    onClick={() => setUrlInput('')}
                    className="btn-secondary"
                  >
                    清空
                  </button>
                </div>
              </div>

              {/* 导入URL列表 */}
              {importUrls.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      待导入 ({importUrls.length})
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setImportUrls([])}
                        className="btn-secondary"
                      >
                        清空全部
                      </button>
                      <button
                        onClick={importAll}
                        disabled={importUrls.every((f) => f.status !== 'pending')}
                        className="btn-primary"
                      >
                        全部导入
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {importUrls.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex gap-4">
                          <div className="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            {item.preview ? (
                              <img
                                src={item.preview}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-gray-400" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) =>
                                  updateImportUrl(index, { title: e.target.value })
                                }
                                className="text-lg font-medium text-gray-900 dark:text-white bg-transparent border-none focus:outline-none w-full"
                                placeholder="图片标题"
                              />
                              <button
                                onClick={() => removeImportUrl(index)}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
                              {item.url}
                            </p>

                            {item.width && item.height && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                尺寸: {item.width} x {item.height}
                              </p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                              <div>
                                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <Calendar className="w-3 h-3" />
                                  年份
                                </label>
                                <select
                                  value={item.year}
                                  onChange={(e) =>
                                    updateImportUrl(index, { year: e.target.value })
                                  }
                                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none"
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
                                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <Tag className="w-3 h-3" />
                                  事件分类
                                </label>
                                <select
                                  value={item.category}
                                  onChange={(e) =>
                                    updateImportUrl(index, { category: e.target.value })
                                  }
                                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none"
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
                                <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <MapPin className="w-3 h-3" />
                                  地点
                                </label>
                                <select
                                  value={item.location}
                                  onChange={(e) =>
                                    updateImportUrl(index, { location: e.target.value })
                                  }
                                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none"
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

                            <div className="mb-3 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                              <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 mb-1">
                                <Tag className="w-3 h-3" />
                                自动生成标签
                              </div>
                              <p className="text-sm text-purple-700 dark:text-purple-300">
                                {generateTags(item).join(' · ') || '选择分类后将自动生成'}
                              </p>
                            </div>

                            <textarea
                              value={item.description}
                              onChange={(e) =>
                                updateImportUrl(index, { description: e.target.value })
                              }
                              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none resize-none"
                              rows={2}
                              placeholder="图片描述..."
                            />

                            <div className="flex items-center justify-between mt-3">
                              <span className="text-xs text-gray-500">
                                来源: {detectSourceType(item.url)}
                              </span>

                              {item.status === 'pending' && (
                                <button
                                  onClick={() => importSingleUrl(item, index)}
                                  className="btn-primary text-sm py-1 px-3"
                                >
                                  导入
                                </button>
                              )}
                              {item.status === 'loading' && (
                                <div className="flex items-center text-blue-600">
                                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                                  <span className="text-sm">处理中...</span>
                                </div>
                              )}
                              {item.status === 'success' && (
                                <div className="flex items-center text-green-600">
                                  <Check className="w-4 h-4 mr-2" />
                                  <span className="text-sm">导入成功</span>
                                </div>
                              )}
                              {item.status === 'error' && (
                                <div className="flex items-center text-red-600">
                                  <AlertCircle className="w-4 h-4 mr-2" />
                                  <span className="text-sm">{item.error}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
