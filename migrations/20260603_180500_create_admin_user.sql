-- 创建管理员账号 gqyzd
-- 此迁移脚本会在每个新环境中自动执行，确保管理员账号存在

DO $$
DECLARE
    admin_user_id UUID;
    admin_email TEXT := 'gqyzd@meoo.local';
    admin_username TEXT := 'gqyzd';
    admin_password TEXT := 'ZJUgqyzd1997';
BEGIN
    -- 检查用户是否已存在
    SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email;
    
    -- 如果用户不存在，则创建
    IF admin_user_id IS NULL THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            invited_at,
            confirmation_token,
            confirmation_sent_at,
            recovery_token,
            recovery_sent_at,
            email_change_token_new,
            email_change,
            email_change_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at,
            phone,
            phone_confirmed_at,
            phone_change,
            phone_change_token,
            phone_change_sent_at,
            email_change_token_current,
            email_change_confirm_status,
            banned_until,
            reauthentication_token,
            reauthentication_sent_at,
            is_sso_user,
            deleted_at,
            is_anonymous
        ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000',
            admin_email,
            crypt(admin_password, gen_salt('bf')),
            NOW(),
            NULL,
            '',
            NULL,
            '',
            NULL,
            '',
            '',
            NULL,
            NULL,
            '{"provider":"email","providers":["email"]}',
            format('{"username":"%s"}', admin_username)::jsonb,
            FALSE,
            NOW(),
            NOW(),
            NULL,
            NULL,
            '',
            '',
            NULL,
            '',
            0,
            NULL,
            '',
            NULL,
            FALSE,
            NULL,
            FALSE
        ) RETURNING id INTO admin_user_id;
        
        RAISE NOTICE 'Created admin user: %', admin_email;
    ELSE
        -- 如果用户已存在，更新密码
        UPDATE auth.users 
        SET encrypted_password = crypt(admin_password, gen_salt('bf'))
        WHERE email = admin_email;
        
        RAISE NOTICE 'Updated password for existing admin user: %', admin_email;
    END IF;
    
    -- 确保 profile 存在（触发器可能已创建）
    INSERT INTO profiles (id, username, display_name, created_at, updated_at)
    VALUES (admin_user_id, admin_username, '管理员', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- 赋予管理员角色
    INSERT INTO user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin user setup complete: %', admin_email;
END $$;
