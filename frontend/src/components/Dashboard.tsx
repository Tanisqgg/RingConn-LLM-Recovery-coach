import { useState } from "react";
import { 
  BarChart3, 
  FileText, 
  Lightbulb, 
  Settings, 
  Brain, 
  Heart, 
  Quote, 
  Search, 
  Zap, 
  BookOpen, 
  Puzzle, 
  User,
} from "lucide-react";
import { Separator } from "./ui/separator";
import { DashboardPage } from "./pages/DashboardPage";
import { ReportsPage } from "./pages/ReportsPage";
import { PromptsPage } from "./pages/PromptsPage";
import { OptimizePage } from "./pages/OptimizePage";
import { IntelligencePage } from "./pages/IntelligencePage";
import { SentimentPage } from "./pages/SentimentPage";
import { CitationsPage } from "./pages/CitationsPage";
import { CrawlersPage } from "./pages/CrawlersPage";
import { LLMTrafficPage } from "./pages/LLMTrafficPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";

const mainNavItems = [
  { icon: BarChart3, label: "Dashboard", active: true },
  { icon: FileText, label: "Reports" },
  { icon: Lightbulb, label: "Prompts" },
  { icon: Settings, label: "Optimize" },
];

const insightItems = [
  { icon: Brain, label: "Intelligence" },
  { icon: Heart, label: "Sentiment" },
  { icon: Quote, label: "Citations" },
];

const analyticsItems = [
  { icon: Search, label: "Crawlers" },
  { icon: Zap, label: "LLM Traffic" },
];

const otherItems = [
  { icon: BookOpen, label: "Learn" },
  { icon: Puzzle, label: "Integrations" },
  { icon: User, label: "My Account" },
];

export function Dashboard() {
  const [activePage, setActivePage] = useState("Dashboard");

  const renderNavItem = (item: any, isActive: boolean) => {
    const Icon = item.icon;
    return (
      <button
        key={item.label}
        onClick={() => setActivePage(item.label)}
        className={`dark-nav-item w-full text-left ${
          isActive ? "dark-nav-item-active" : ""
        }`}
      >
        <Icon className={`w-5 h-5 ${isActive ? "text-dark-primary" : "text-dark-secondary"}`} />
        <span>{item.label}</span>
      </button>
    );
  };

  const renderContent = () => {
    switch (activePage) {
      case "Dashboard":
        return <DashboardPage />;
      case "Reports":
        return <ReportsPage />;
      case "Prompts":
        return <PromptsPage />;
      case "Optimize":
        return <OptimizePage />;
      case "Intelligence":
        return <IntelligencePage />;
      case "Sentiment":
        return <SentimentPage />;
      case "Citations":
        return <CitationsPage />;
      case "Crawlers":
        return <CrawlersPage />;
      case "LLM Traffic":
        return <LLMTrafficPage />;
      case "Integrations":
        return <IntegrationsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-dark-bg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div className="w-72 bg-dark-bg border-r border-dark-color flex flex-col">
        {/* Logo */}
        <div className="p-8 border-b border-dark-color">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center dark-shadow-lg relative overflow-hidden">
              <span className="text-white font-bold text-lg relative z-10">A8</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark-primary">AI8 Digital</h1>
              <p className="text-xs text-dark-secondary font-medium">LLM Analytics Platform</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-6 space-y-8 overflow-y-auto">
          {/* Main Navigation */}
          <div className="space-y-2">
            {mainNavItems.map((item) => renderNavItem(item, activePage === item.label))}
          </div>

          <Separator style={{ backgroundColor: '#374151' }} />

          {/* Insight Group */}
          <div className="space-y-4">
            <div className="px-4">
              <h3 className="text-xs font-bold text-dark-secondary uppercase tracking-widest">Insight</h3>
            </div>
            <div className="space-y-2">
              {insightItems.map((item) => renderNavItem(item, activePage === item.label))}
            </div>
          </div>

          <Separator style={{ backgroundColor: '#374151' }} />

          {/* Analytics Group */}
          <div className="space-y-4">
            <div className="px-4">
              <h3 className="text-xs font-bold text-dark-secondary uppercase tracking-widest">Analytics</h3>
            </div>
            <div className="space-y-2">
              {analyticsItems.map((item) => renderNavItem(item, activePage === item.label))}
            </div>
          </div>

          <Separator style={{ backgroundColor: '#374151' }} />

          {/* Other */}
          <div className="space-y-4">
            <div className="px-4">
              <h3 className="text-xs font-bold text-dark-secondary uppercase tracking-widest">Other</h3>
            </div>
            <div className="space-y-2">
              {otherItems.map((item) => renderNavItem(item, activePage === item.label))}
            </div>
          </div>
        </nav>

        {/* Bottom CTA */}
        <div className="p-6 border-t border-dark-color">
          <div className="bg-dark-card rounded-xl p-4 text-center border border-dark-color">
            <h4 className="text-sm font-bold text-dark-primary mb-2">Upgrade to Pro</h4>
            <p className="text-xs text-dark-secondary mb-3">Unlock advanced analytics</p>
            <button className="dark-button-primary text-xs py-2 px-4 w-full">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}