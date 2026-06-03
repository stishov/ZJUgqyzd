// 管理员登录测试脚本
// 在浏览器控制台运行此脚本测试管理员登录

async function testAdminLogin() {
  console.log('=== 管理员登录测试 ===\n');
  
  // 测试凭据
  const username = 'admin';
  const password = 'admin123';
  
  console.log('1. 测试登录凭据:');
  console.log('   用户名:', username);
  console.log('   密码:', password);
  console.log('   邮箱:', `${username}@meoo.local`);
  
  // 检查当前会话
  const { data: { session } } = await supabase.auth.getSession();
  console.log('\n2. 当前会话状态:');
  console.log('   是否已登录:', !!session);
  
  if (session?.user) {
    console.log('   当前用户ID:', session.user.id);
    
    // 获取用户信息
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    console.log('   当前用户名:', profile?.username);
    
    // 获取角色
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);
    
    console.log('   当前角色:', roles?.map(r => r.role) || []);
    console.log('   是否管理员:', roles?.some(r => r.role === 'admin'));
  }
  
  console.log('\n3. 尝试登录...');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${username}@meoo.local`,
    password: password,
  });
  
  if (error) {
    console.error('   登录失败:', error.message);
    return false;
  }
  
  console.log('   登录成功!');
  console.log('   用户ID:', data.user?.id);
  
  // 获取用户信息
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user?.id)
    .single();
  
  console.log('   用户名:', profile?.username);
  
  // 获取角色
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', data.user?.id);
  
  console.log('   角色:', roles?.map(r => r.role) || []);
  console.log('   是否管理员:', roles?.some(r => r.role === 'admin'));
  
  console.log('\n=== 测试完成 ===');
  return true;
}

// 导出测试函数
window.testAdminLogin = testAdminLogin;

console.log('管理员登录测试脚本已加载');
console.log('在控制台运行 testAdminLogin() 开始测试');