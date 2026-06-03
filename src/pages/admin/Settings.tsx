import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { Save, AlertCircle, Settings } from 'lucide-react';

interface SystemSetting {
  key: string;
  value: string;
  description: string;
}

export default function AdminSettings() {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  async function fetchSettings() {
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .order('key');
    if (data) {
      setSettings(
        data.map((s) => ({
          key: s.key,
          value: String(s.value),
          description: s.description || '',
        }))
      );
    }
    setIsLoading(false);
  }

  async function saveSetting(key: string, value: string) {
    setIsSaving(true);
    await supabase
      .from('system_settings')
      .update({ value: JSON.stringify(value) })
      .eq('key', key);
    setIsSaving(false);
  }

  function formatBytesSetting(value: string) {
    const bytes = parseInt(value);
    if (isNaN(bytes)) return '10';
    return (bytes / 1024 / 1024).toString();
  }

  function parseBytesSetting(mb: string) {
    const mbValue = parseInt(mb);
    if (isNaN(mbValue)) return '10485760';
    return (mbValue * 1024 * 1024).toString();
  }

  if (!isAdmin) {
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            系统设置
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            配置网站参数
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="space-y-6">
            {settings.map((setting) => (
              <motion.div
                key={setting.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0 last:pb-0"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {setting.key === 'site_name' && '网站名称'}
                      {setting.key === 'max_upload_size' && '最大上传大小 (MB)'}
                      {setting.key === 'allowed_formats' && '允许的图片格式'}
                      {setting.key === 'default_storage_limit' && '默认存储空间 (MB)'}
                      {setting.key === 'require_approval' && '图片审核'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {setting.description}
                    </p>
                  </div>
                </div>

                {setting.key === 'max_upload_size' && (
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={formatBytesSetting(setting.value)}
                      onChange={(e) => {
                        const newSettings = settings.map((s) =>
                          s.key === setting.key
                            ? { ...s, value: parseBytesSetting(e.target.value) }
                            : s
                        );
                        setSettings(newSettings);
                      }}
                      className="form-input w-32"
                      min="1"
                      max="100"
                    />
                    <button
                      onClick={() => saveSetting(setting.key, setting.value)}
                      disabled={isSaving}
                      className="btn-primary"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </button>
                  </div>
                )}

                {setting.key === 'default_storage_limit' && (
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={formatBytesSetting(setting.value)}
                      onChange={(e) => {
                        const newSettings = settings.map((s) =>
                          s.key === setting.key
                            ? { ...s, value: parseBytesSetting(e.target.value) }
                            : s
                        );
                        setSettings(newSettings);
                      }}
                      className="form-input w-32"
                      min="100"
                      max="10240"
                    />
                    <button
                      onClick={() => saveSetting(setting.key, setting.value)}
                      disabled={isSaving}
                      className="btn-primary"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </button>
                  </div>
                )}

                {setting.key === 'require_approval' && (
                  <div className="flex items-center gap-4">
                    <select
                      value={setting.value}
                      onChange={(e) => {
                        const newSettings = settings.map((s) =>
                          s.key === setting.key
                            ? { ...s, value: e.target.value }
                            : s
                        );
                        setSettings(newSettings);
                      }}
                      className="form-input w-40"
                    >
                      <option value="true">需要审核</option>
                      <option value="false">自动通过</option>
                    </select>
                    <button
                      onClick={() => saveSetting(setting.key, setting.value)}
                      disabled={isSaving}
                      className="btn-primary"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </button>
                  </div>
                )}

                {setting.key === 'site_name' && (
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      value={setting.value.replace(/"/g, '')}
                      onChange={(e) => {
                        const newSettings = settings.map((s) =>
                          s.key === setting.key
                            ? { ...s, value: `"${e.target.value}"` }
                            : s
                        );
                        setSettings(newSettings);
                      }}
                      className="form-input flex-1"
                    />
                    <button
                      onClick={() => saveSetting(setting.key, setting.value)}
                      disabled={isSaving}
                      className="btn-primary"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存
                    </button>
                  </div>
                )}

                {setting.key === 'allowed_formats' && (
                  <div className="text-gray-600 dark:text-gray-400 text-sm">
                    {JSON.parse(setting.value).join(', ')}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}