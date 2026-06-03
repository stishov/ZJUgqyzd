# 数据库设计指南

## 设计原则

### 匿名优先
默认支持匿名访问。用户应能在不认证的情况下操作数据，登录仅在明确需要时才实现。

## 表设计规范

- 考虑列的**默认值**和**可空性**，避免插入数据时出错
- 与现有数据兼容，迭代时考虑现有数据结构
- Supabase 默认限制每次查询 **1000 行**，大数据集需要分页
- 所有表都需要启用 RLS，且 RLS 权限设计要与功能实现保持一致
- 使用 UUID 作为 id，在实现功能代码时要注意字段格式与数据库字段类型一致

## 约束和验证

### 使用触发器而非 CHECK 约束
```sql
-- ✅ 推荐：验证触发器
CREATE OR REPLACE FUNCTION validate_expire_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.expire_at <= now() THEN
    RAISE EXCEPTION 'expire_at must be in the future';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_expire_at_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION validate_expire_at();
```

## RLS 策略设计

### 基本 RLS 配置
```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

### 策略命名规范

用**英文 snake_case 无引号**，格式 `<scope>_<action>_<table>`，例：`anon_select_posts`、`users_update_own_data`、`admins_select_profiles`。不要用中文或带空格的名字（会和 `--sql "..."` 外层引号冲突）。

### 匿名友好的策略
```sql
-- 所有人可查看
CREATE POLICY anon_select_posts ON posts FOR SELECT USING (true);

-- 所有人可创建
CREATE POLICY anon_insert_posts ON posts FOR INSERT WITH CHECK (true);
```

### 用户数据策略（需要登录功能时）
```sql
-- 用户只能查看自己的数据
CREATE POLICY users_select_own_data ON user_data
FOR SELECT USING (user_id = auth.uid());

-- 用户只能修改自己的数据
CREATE POLICY users_update_own_data ON user_data
FOR UPDATE USING (user_id = auth.uid());
```

### 避免 RLS 权限冲突

**重要**：点赞、评论等功能必须创建独立表，不能在原表中直接添加字段，因为会导致 RLS 权限冲突。

```sql
-- 假设原表有严格的 UPDATE 权限
CREATE POLICY users_update_own_messages ON messages
FOR UPDATE USING (user_id = auth.uid());

-- ❌ 错误：在原表中添加点赞字段
-- 点赞操作变成 UPDATE messages，受限于上面的策略
ALTER TABLE messages ADD COLUMN likes INTEGER DEFAULT 0;

-- ✅ 正确：创建独立表
-- 点赞操作是 INSERT message_likes，可以设置不同的权限
CREATE TABLE message_likes (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 任何人都能点赞
CREATE POLICY anon_insert_message_likes ON message_likes FOR INSERT WITH CHECK (true);
```

## 用户配置文件（需要登录功能时）

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 自动创建配置文件的触发器
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 避免修改保留模式
不要操作这些 Supabase 保留模式：
- `auth` · `storage` · `realtime` · `supabase_functions` · `vault`

可以引用 `auth.users(id)` 作为外键，但不能修改模式结构。

## 查询最佳实践
**注意**：必须通过友好的 Toast 交互提醒用户数据操作结果，特别是操作失败的情况。
```typescript
// ✅ 正确：必须检查 error 对象
const { data, error } = await supabase
  .from('profiles')
  .select()
  .eq('id', id)
  .maybeSingle();

if (error) {
  console.error('数据库错误:', error.message);
  throw new Error(`查询失败: ${error.message}`);
}

if (!data) { /* 处理未找到的情况 */ }

// ✅ 分页查询
const { data, error } = await supabase
  .from('posts')
  .select()
  .range(0, 49); // 前50条记录

if (error) throw new Error(error.message);

// ❌ 错误：忽略 error 对象会导致静默失败
const { data } = await supabase.from('profiles').select();
```

## 常见问题

### RLS 策略必须匹配功能
如果应用没有登录功能，数据应该公开可见。策略名称应反映实际功能需求。

### 避免 RLS 无限递归
RLS 无限递归通常发生在策略互相引用时，必须避免会导致无限递归的错误情况：
```sql
-- ❌ 错误：导致无限递归
CREATE POLICY admins_select_profiles ON profiles
FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- ✅ 正确：使用 SECURITY DEFINER 函数
CREATE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY admins_select_profiles ON profiles
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
```

**关键**：权限函数必须使用 `SECURITY DEFINER`，基础权限表策略保持简单。