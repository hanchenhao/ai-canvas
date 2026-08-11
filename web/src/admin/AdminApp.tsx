/** @jsxImportSource @emotion/react */
import { useCallback, useMemo, useState } from "react";
import { useTheme } from "@mui/material/styles";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import StorageRoundedIcon from "@mui/icons-material/StorageRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import {
  AlertBanner,
  Card,
  Divider,
  EditorButton,
  FlexColumn,
  FlexRow,
  LoadingSpinner,
  SPACING,
  StatusIndicator,
  Text,
  TextInput,
  ThemeToggleButton
} from "../components/ui_primitives";
import { trpc, type RouterOutputs } from "../trpc/client";
import { PRODUCT_NAME } from "../studio/productConfig";

type Section = "overview" | "providers" | "storage" | "users";
type ProviderStatus = RouterOutputs["admin"]["status"]["providers"][number];

const sectionItems: Array<{
  id: Section;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "overview", label: "运行概览", icon: <DashboardRoundedIcon /> },
  { id: "providers", label: "模型与密钥", icon: <KeyRoundedIcon /> },
  { id: "storage", label: "对象存储", icon: <StorageRoundedIcon /> },
  { id: "users", label: "用户管理", icon: <PeopleRoundedIcon /> }
];

interface ProviderCredentialCardProps {
  provider: ProviderStatus;
}

const ProviderCredentialCard = ({ provider }: ProviderCredentialCardProps) => {
  const utils = trpc.useUtils();
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const upsert = trpc.settings.secrets.upsert.useMutation();
  const validate = trpc.settings.secrets.validate.useMutation();
  const busy = upsert.isPending || validate.isPending;

  const testAndSave = useCallback(async () => {
    const candidate = value.trim();
    if (!candidate && !provider.configured) {
      setMessage({ type: "error", text: "请输入 API Key。" });
      return;
    }
    setMessage(null);
    try {
      const result = await validate.mutateAsync({
        key: provider.secretKey,
        ...(candidate ? { value: candidate } : {})
      });
      if (result.status === "invalid") {
        setMessage({ type: "error", text: result.message });
        return;
      }
      if (candidate) {
        await upsert.mutateAsync({
          key: provider.secretKey,
          value: candidate,
          description: `${provider.name} API Key`
        });
        setValue("");
        await utils.admin.status.invalidate();
      }
      setMessage({
        type: result.status === "valid" ? "success" : "info",
        text:
          result.status === "valid"
            ? "连接成功，密钥已加密保存。"
            : `密钥已保存；供应商暂时无法自动验证：${result.message}`
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "保存失败"
      });
    }
  }, [provider, upsert, utils.admin.status, validate, value]);

  return (
    <Card variant="outlined" padding="comfortable" sx={{ flex: "1 1 280px" }}>
      <FlexColumn gap={SPACING.lg}>
        <FlexRow align="center" justify="space-between" gap={SPACING.md}>
          <FlexColumn gap={SPACING.xs}>
            <Text size="big" weight={600}>
              {provider.name}
            </Text>
            <Text size="smaller" color="secondary" family="secondary">
              {provider.secretKey}
            </Text>
          </FlexColumn>
          <StatusIndicator
            status={provider.configured ? "success" : "warning"}
            filledIcon
            label={provider.configured ? "已配置" : "未配置"}
          />
        </FlexRow>
        <TextInput
          type="password"
          label={provider.configured ? "替换密钥" : "API Key"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={
            provider.configured ? "保留为空可只测试连接" : "输入密钥"
          }
          autoComplete="new-password"
        />
        <EditorButton
          variant="contained"
          onClick={() => void testAndSave()}
          disabled={busy}
        >
          {busy ? "正在验证…" : value.trim() ? "验证并保存" : "测试连接"}
        </EditorButton>
        {message && (
          <AlertBanner compact severity={message.type}>
            {message.text}
          </AlertBanner>
        )}
      </FlexColumn>
    </Card>
  );
};

const OverviewPanel = ({
  status
}: {
  status: RouterOutputs["admin"]["status"];
}) => {
  const configuredCount = status.providers.filter(
    (item) => item.configured
  ).length;
  return (
    <FlexColumn gap={SPACING.xl}>
      <FlexColumn gap={SPACING.xs}>
        <Text size="giant" weight={600}>
          运行概览
        </Text>
        <Text color="secondary">查看部署、凭据与存储的关键状态。</Text>
      </FlexColumn>
      <FlexRow gap={SPACING.lg} wrap>
        <Card variant="outlined" padding="comfortable" sx={{ flex: 1 }}>
          <FlexColumn gap={SPACING.md}>
            <Text size="small" color="secondary">
              服务状态
            </Text>
            <StatusIndicator status="success" filledIcon label="运行正常" />
            <Text size="smaller" color="secondary">
              Node {status.nodeVersion} · 已运行 {status.uptimeSeconds} 秒
            </Text>
          </FlexColumn>
        </Card>
        <Card variant="outlined" padding="comfortable" sx={{ flex: 1 }}>
          <FlexColumn gap={SPACING.md}>
            <Text size="small" color="secondary">
              模型供应商
            </Text>
            <Text size="giant" weight={600}>
              {configuredCount} / {status.providers.length}
            </Text>
            <Text size="smaller" color="secondary">
              已配置可用凭据
            </Text>
          </FlexColumn>
        </Card>
        <Card variant="outlined" padding="comfortable" sx={{ flex: 1 }}>
          <FlexColumn gap={SPACING.md}>
            <Text size="small" color="secondary">
              素材存储
            </Text>
            <Text size="big" weight={600}>
              {status.storage.kind.toUpperCase()}
            </Text>
            <Text size="smaller" color="secondary">
              {status.storage.bucket ?? "本机文件系统"}
            </Text>
          </FlexColumn>
        </Card>
      </FlexRow>
      {!status.secretEncryptionConfigured && (
        <AlertBanner severity="warning" title="未固定密钥加密主密钥">
          请在生产环境设置
          SECRETS_MASTER_KEY；否则迁移数据库后可能无法解密已保存凭据。
        </AlertBanner>
      )}
    </FlexColumn>
  );
};

const ProvidersPanel = ({ providers }: { providers: ProviderStatus[] }) => (
  <FlexColumn gap={SPACING.xl}>
    <FlexColumn gap={SPACING.xs}>
      <Text size="giant" weight={600}>
        模型与密钥
      </Text>
      <Text color="secondary">
        密钥提交到服务端后使用 AES-GCM 加密保存；页面不会读取或回显明文。
      </Text>
    </FlexColumn>
    <FlexRow gap={SPACING.lg} wrap>
      {providers.map((provider) => (
        <ProviderCredentialCard key={provider.id} provider={provider} />
      ))}
    </FlexRow>
  </FlexColumn>
);

const StoragePanel = ({
  storage
}: {
  storage: RouterOutputs["admin"]["status"]["storage"];
}) => (
  <FlexColumn gap={SPACING.xl}>
    <FlexColumn gap={SPACING.xs}>
      <Text size="giant" weight={600}>
        对象存储
      </Text>
      <Text color="secondary">
        存储属于全局部署配置，修改环境变量并重启服务后生效。
      </Text>
    </FlexColumn>
    {storage.error && (
      <AlertBanner severity="error">{storage.error}</AlertBanner>
    )}
    <Card variant="outlined" padding="comfortable">
      <FlexColumn gap={SPACING.lg}>
        <FlexRow justify="space-between" align="center">
          <Text size="small" color="secondary">
            当前后端
          </Text>
          <StatusIndicator
            status={storage.kind === "invalid" ? "error" : "success"}
            filledIcon
            label={storage.kind}
          />
        </FlexRow>
        <Divider />
        <Text family="secondary" size="small">
          Bucket: {storage.bucket ?? "—"}
        </Text>
        <Text family="secondary" size="small">
          Region: {storage.region ?? "—"}
        </Text>
        <Text family="secondary" size="small">
          Endpoint: {storage.endpoint ?? "—"}
        </Text>
        <Text family="secondary" size="small">
          Path style:{" "}
          {storage.forcePathStyle === null
            ? "—"
            : String(storage.forcePathStyle)}
        </Text>
      </FlexColumn>
    </Card>
    <AlertBanner severity="info" title="阿里云 OSS 配置要求">
      使用 S3 兼容 Endpoint，并将 S3_FORCE_PATH_STYLE 设为 false。AccessKey
      仅放在服务器环境变量或部署密钥中。
    </AlertBanner>
  </FlexColumn>
);

const UsersPanel = () => {
  const users = trpc.users.list.useQuery();
  return (
    <FlexColumn gap={SPACING.xl}>
      <FlexColumn gap={SPACING.xs}>
        <Text size="giant" weight={600}>
          用户管理
        </Text>
        <Text color="secondary">只有管理员可以访问本列表与令牌管理接口。</Text>
      </FlexColumn>
      {users.isLoading && <LoadingSpinner />}
      {users.error && (
        <AlertBanner severity="error">{users.error.message}</AlertBanner>
      )}
      {(users.data?.users ?? []).map((user) => (
        <Card key={user.username} variant="outlined" padding="normal">
          <FlexRow align="center" justify="space-between" gap={SPACING.lg}>
            <FlexColumn gap={SPACING.xs}>
              <Text weight={600}>{user.username}</Text>
              <Text size="smaller" color="secondary" family="secondary">
                ID: {user.user_id} · 创建于 {user.created_at}
              </Text>
            </FlexColumn>
            <StatusIndicator status="info" label={user.role} />
          </FlexRow>
        </Card>
      ))}
    </FlexColumn>
  );
};

const AdminApp = () => {
  const theme = useTheme();
  const [section, setSection] = useState<Section>("overview");
  const status = trpc.admin.status.useQuery(undefined, {
    refetchInterval: 30_000,
    retry: false
  });
  const content = useMemo(() => {
    if (!status.data) return null;
    if (section === "providers")
      return <ProvidersPanel providers={status.data.providers} />;
    if (section === "storage")
      return <StoragePanel storage={status.data.storage} />;
    if (section === "users") return <UsersPanel />;
    return <OverviewPanel status={status.data} />;
  }, [section, status.data]);

  if (status.isLoading) {
    return (
      <FlexColumn fullHeight align="center" justify="center" gap={SPACING.lg}>
        <LoadingSpinner size="large" />
        <Text color="secondary">正在验证管理员权限…</Text>
      </FlexColumn>
    );
  }
  if (status.error || !status.data) {
    return (
      <FlexColumn fullHeight align="center" justify="center" gap={SPACING.xl}>
        <SecurityRoundedIcon color="error" />
        <Text size="big" weight={600}>
          无权访问管理后台
        </Text>
        <Text color="secondary">
          请使用 ADMIN_USER_IDS 中的管理员账号登录。
        </Text>
        <EditorButton href="/" variant="outlined">
          返回创作端
        </EditorButton>
      </FlexColumn>
    );
  }

  return (
    <FlexColumn fullHeight sx={{ minHeight: 0 }}>
      <FlexRow
        align="center"
        gap={SPACING.md}
        sx={{
          flexShrink: 0,
          px: SPACING.xl,
          py: SPACING.md,
          borderBottom: `1px solid ${theme.vars.palette.divider}`
        }}
      >
        <SecurityRoundedIcon color="primary" />
        <Text size="big" weight={600}>
          {PRODUCT_NAME} 管理后台
        </Text>
        <FlexRow sx={{ flex: 1 }} />
        <EditorButton
          startIcon={<RefreshRoundedIcon />}
          onClick={() => void status.refetch()}
        >
          刷新
        </EditorButton>
        <EditorButton href="/" startIcon={<OpenInNewRoundedIcon />}>
          打开创作端
        </EditorButton>
        <ThemeToggleButton />
      </FlexRow>
      <FlexRow sx={{ flex: 1, minHeight: 0 }}>
        <FlexColumn
          gap={SPACING.xs}
          sx={{
            width: { xs: 72, md: 224 },
            flexShrink: 0,
            p: SPACING.md,
            borderRight: `1px solid ${theme.vars.palette.divider}`
          }}
        >
          {sectionItems.map((item) => (
            <EditorButton
              key={item.id}
              variant={section === item.id ? "contained" : "text"}
              startIcon={item.icon}
              onClick={() => setSection(item.id)}
              sx={{ justifyContent: { xs: "center", md: "flex-start" } }}
              aria-label={item.label}
            >
              <Text
                component="span"
                sx={{ display: { xs: "none", md: "block" } }}
              >
                {item.label}
              </Text>
            </EditorButton>
          ))}
        </FlexColumn>
        <FlexColumn
          sx={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            p: { xs: SPACING.xl, md: SPACING.xxxl }
          }}
        >
          {content}
        </FlexColumn>
      </FlexRow>
    </FlexColumn>
  );
};

export default AdminApp;
