import { KeyRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getCurrentUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Профиль, внешний вид и интеграции" />

      <div className="space-y-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Профиль</CardTitle>
            <CardDescription>Данные вашего аккаунта</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Имя</Label>
              <Input id="profile-name" defaultValue={user?.name ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" defaultValue={user?.email ?? ""} disabled />
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Внешний вид</CardTitle>
            <CardDescription>Светлая или тёмная тема</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Тема оформления</span>
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Интеграции и API-ключи
            </CardTitle>
            <CardDescription>
              OpenRouter (AI) и ключи карт настраиваются через переменные окружения
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Управление ключами из интерфейса появится в следующих этапах. Сейчас
            ключи задаются в <code className="text-foreground">.env</code> (см.
            <code className="text-foreground"> .env.example</code>).
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
