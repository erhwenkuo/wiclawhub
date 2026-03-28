import {
  createRootRoute,
  createRoute,
  useParams,
} from "@tanstack/react-router";
import { RootLayout } from "./components/RootLayout";
import { HomePage } from "./routes/index";
import { SkillsPage } from "./routes/skills";
import { SkillDetailPage } from "./routes/skillDetail";
import { SearchPage } from "./routes/search";
import { LoginPage } from "./routes/login";
import { SignUpPage } from "./routes/signup";
import { AuthCallbackPage } from "./routes/authCallback";
import { DashboardPage } from "./routes/dashboard";
import { UploadPage } from "./routes/publish-skill";
import { SettingsPage } from "./routes/settings";
import { UserProfilePage } from "./routes/userProfile";
import { CliAuthPage } from "./routes/cliAuth";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const skillsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/skills",
  component: SkillsPage,
});

const skillDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/skills/$slug",
  component: function SkillDetailWrapper() {
    const { slug } = useParams({ from: "/skills/$slug" });
    return SkillDetailPage({ slug });
  },
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: SearchPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: SignUpPage,
});

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/callback",
  component: AuthCallbackPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const publishSkillRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/publish-skill",
  component: UploadPage,
  validateSearch: (search: Record<string, unknown>): { updateSlug?: string } => ({
    updateSlug: (search.updateSlug as string) || undefined,
  }),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const userProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/u/$handle",
  component: function UserProfileWrapper() {
    const { handle } = useParams({ from: "/u/$handle" });
    return UserProfilePage({ handle });
  },
});

const cliAuthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cli/auth",
  component: CliAuthPage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  skillsRoute,
  skillDetailRoute,
  searchRoute,
  loginRoute,
  signupRoute,
  authCallbackRoute,
  dashboardRoute,
  publishSkillRoute,
  settingsRoute,
  userProfileRoute,
  cliAuthRoute,
]);
