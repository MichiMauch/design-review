import StatsGrid from './StatsGrid';
import ProjectStatsTable from './ProjectStatsTable';

export default function StatsTab({ tasks, projects, stats, users, allProjects }) {
  return (
    <div>
      <StatsGrid
        tasks={tasks}
        projects={projects}
        stats={stats}
        users={users}
        allProjects={allProjects}
      />
      <ProjectStatsTable allProjects={allProjects} tasks={tasks} />
    </div>
  );
}