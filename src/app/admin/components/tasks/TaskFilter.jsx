export default function TaskFilter({ filter, projects, allProjects, onFilterChange }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">
          Projekt filtern:
        </label>
        <select
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="all">Alle Projekte</option>
          {projects.map(project => (
            <option key={project} value={project}>
              {(() => {
                // Try to find real project name for better display
                const realProject = allProjects.find(p =>
                  p.name === project ||
                  p.id.toString() === project ||
                  p.domain.includes(project)
                );
                return realProject ? `${realProject.name} (${project})` : project;
              })()}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}