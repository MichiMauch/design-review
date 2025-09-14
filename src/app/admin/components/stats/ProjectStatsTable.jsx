import { formatDate } from '../../services/utils';

export default function ProjectStatsTable({ allProjects, tasks }) {
  const projectsWithStats = allProjects
    .map(project => {
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      return { ...project, taskCount: projectTasks.length, projectTasks };
    })
    .sort((a, b) => b.taskCount - a.taskCount);

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-medium text-gray-900">Projekt Übersicht</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Projekt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task Anzahl
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Letzter Task
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Screenshots
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projectsWithStats.map(project => {
              const withScreenshots = project.projectTasks.filter(
                t => t.screenshot || t.screenshot_url
              ).length;
              const latest = project.projectTasks.length > 0
                ? project.projectTasks.sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at)
                  )[0]
                : null;

              return (
                <tr key={project.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{project.name}</div>
                    <div className="text-sm text-gray-500">{project.domain}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{project.taskCount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {latest ? formatDate(latest.created_at) : 'Keine Tasks'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {project.taskCount > 0 ? `${withScreenshots}/${project.taskCount}` : '0/0'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}