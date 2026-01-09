import Sidebar from "@/components/Sidebar";
import GreetingHeader from "@/components/GreetingHeader";
import StatsCards from "@/components/StatsCards";
import TasksSection from "@/components/TasksSection";
import DocumentsSection from "@/components/DocumentsSection";
import FormsSection from "@/components/FormsSection";

const Index = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <GreetingHeader />
          
          <StatsCards />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TasksSection />
            <div className="space-y-6">
              <DocumentsSection />
              <FormsSection />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
