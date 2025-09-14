import { MessageSquare, Globe, Calendar, CheckSquare, User } from 'lucide-react';
import StatCard from './StatCard';
import { getTasksForToday, getTasksForWeek, getTopProject } from '../../services/utils';

export default function StatsGrid({ tasks, projects, stats, users, allProjects }) {
  const todayTasks = getTasksForToday(tasks);
  const weekTasks = getTasksForWeek(tasks);
  const topProject = getTopProject(tasks, allProjects);

  return (
    <>
      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={MessageSquare}
          iconColor="text-blue-600"
          label="Gesamt Tasks"
          value={tasks.length}
        />
        <StatCard
          icon={Globe}
          iconColor="text-green-600"
          label="Projekte"
          value={projects.length}
        />
        <StatCard
          icon={Calendar}
          iconColor="text-purple-600"
          label="Heute"
          value={todayTasks.length}
        />
      </div>

      {/* Extended Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={CheckSquare}
            iconColor="text-orange-600"
            label="Durchschn. pro Tag"
            value={stats.avgPerDay || Math.round(tasks.length / 30)}
          />
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Top Projekt
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {topProject}
                </p>
              </div>
            </div>
          </div>
          <StatCard
            icon={User}
            iconColor="text-green-600"
            label="Benutzer"
            value={users.length}
          />
          <StatCard
            icon={Calendar}
            iconColor="text-red-600"
            label="Diese Woche"
            value={weekTasks.length}
          />
        </div>
      )}
    </>
  );
}