# 用户认证

> 仅在用户明确要求登录功能时才实现认证。默认设计应支持匿名访问。

## 认证方法

### 用户名登录（默认方式）
**这是 Meoo 项目的标准登录方式**，用户使用用户名登录，要自动生成 `{username}@meoo.local` 虚拟邮箱以兼容 Supabase 认证系统。

### 手机号登录
使用手机号作为用户名，同样自动生成 `{username}@meoo.local` 虚拟邮箱。

### 邮箱登录
仅在用户明确要求使用真实邮箱时才使用的标准邮箱/密码认证。

## ❌ 不支持的登录方式

以下登录方式 **不支持**，如果用户要求请明确告知无法实现：

- **手机验证码登录**：不支持短信验证码
- **第三方登录**：不支持微信、QQ、支付宝、GitHub 等第三方登录
- **扫码登录**：不支持二维码扫码登录
- **指纹/面部识别**：不支持生物识别登录
- **无密码登录**：不支持魔法链接等无密码方式

**如果用户要求以上登录方式，请明确说明 Meoo Cloud 目前仅支持用户名/密码的登录方式。**

## 实现要点

### 1. 存储完整会话对象
```typescript
const [session, setSession] = useState<Session | null>(null);
```

### 2. 用户名认证示例（标准实现）
**必须使用此方式实现登录注册**，除非用户明确要求使用真实邮箱：
```typescript
// 注册
await supabase.auth.signUp({
  email: `${username}@meoo.local`,
  password,
  options: { data: { username } }
});

// 登录
await supabase.auth.signInWithPassword({
  email: `${username}@meoo.local`,
  password,
});
```

### 3. 认证状态监听
```typescript
// ✅ 正确：同步状态更新
supabase.auth.onAuthStateChange((event, session) => {
  setSession(session);
  setUser(session?.user ?? null);

  // 延迟任何 Supabase 调用
  if (session?.user) {
    setTimeout(() => {
      fetchUserProfile(session.user.id);
    }, 0);
  }
});

// ❌ 错误：会导致死锁
supabase.auth.onAuthStateChange(async (event, session) => {
  const profile = await supabase.from('profiles').select()... // 死锁
});
```

## 用户数据表设计

### 用户配置文件表

**重要**：只有当用户明确要求注册和登录功能时，才创建 `public.profiles` 表与 `auth.users` 表关联。

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和修改自己的配置文件
CREATE POLICY users_select_own_profile ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_update_own_profile ON public.profiles
FOR UPDATE USING (auth.uid() = id);
```

### 自动创建配置文件触发器

设置触发器在用户注册时自动创建配置文件：

```sql
-- 插入 public.profiles 的函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'username',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

> 不要忘记 `SECURITY DEFINER`！

### 业务表与用户关联

如果需要在业务表中引用用户信息，请引用 profiles 表的 `id`：

```sql
CREATE TABLE public.user_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.user_posts ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和操作自己的帖子
CREATE POLICY users_select_own_posts ON public.user_posts
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY users_insert_own_posts ON public.user_posts
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY users_update_own_posts ON public.user_posts
FOR UPDATE USING (user_id = auth.uid());
```

### 角色和权限设计

角色**必须**存储在独立表中，不要在 profiles 表中存储角色：

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 辅助函数检查用户角色
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

## 创建测试用户

```sql
INSERT INTO auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  confirmation_token, recovery_token,
  email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), 'authenticated', 'authenticated',
  'testuser@meoo.local',
  crypt('password123', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"username":"testuser"}'::jsonb,
  false
);
```

必需字段：`instance_id`、`::jsonb` 类型转换、空字符串令牌（非 NULL）