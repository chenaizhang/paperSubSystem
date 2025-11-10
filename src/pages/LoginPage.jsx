import {
  Anchor,
  Box,
  Button,
  Paper,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  LoadingOverlay,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../features/auth/AuthProvider.jsx";
import { useEffect } from "react";

const schema = z.object({
  email: z.string().email({ message: "请输入正确的邮箱地址" }),
  password: z.string().min(6, { message: "密码长度至少 6 位" }),
  role: z.enum(["author", "expert", "editor"], {
    required_error: "请选择角色",
  }),
});

const roleRedirect = {
  author: "/author/dashboard",
  expert: "/expert/dashboard",
  editor: "/editor/dashboard",
};

export default function LoginPage() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  useEffect(() => {
    if (isAuthenticated && role && roleRedirect[role]) {
      navigate(roleRedirect[role], { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
      role: "author",
    },
    validate: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (values) => login(values),
    onSuccess: (data) => {
      const target = from || roleRedirect[data.role] || "/";
      navigate(target, { replace: true });
    },
    onError: (error) => {
      form.setErrors({
        email: error.friendlyMessage || "用户名或密码错误",
        password: error.friendlyMessage || "用户名或密码错误",
      });
    },
  });

  return (
    <Box h="100vh" style={{ background: "var(--mantine-color-gray-1)" }}>
      <Stack justify="center" align="center" h="100%">
        <Paper shadow="lg" radius="md" p="xl" withBorder w={400} pos="relative">
          <LoadingOverlay
            visible={mutation.isPending}
            zIndex={1000}
            overlayProps={{ blur: 2 }}
          />
          <Stack>
            <Title order={3}>欢迎登录论文投稿系统</Title>
            <Text c="dimmed">请使用注册邮箱和密码登录，可选择接入角色。</Text>
            <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
              <Stack>
                <TextInput
                  required
                  label="邮箱"
                  placeholder="name@example.com"
                  {...form.getInputProps("email")}
                />
                <PasswordInput
                  required
                  label="密码"
                  placeholder="请输入密码"
                  {...form.getInputProps("password")}
                />
                <Select
                  required
                  label="角色"
                  data={[
                    { label: "作者", value: "author" },
                    { label: "专家", value: "expert" },
                    { label: "编辑", value: "editor" },
                  ]}
                  {...form.getInputProps("role")}
                />
                <Button type="submit" loading={mutation.isPending}>
                  登录
                </Button>
              </Stack>
            </form>
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
