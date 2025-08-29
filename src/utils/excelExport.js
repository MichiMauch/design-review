import * as XLSX from 'xlsx';

export async function exportTasksToExcel(tasks, projectName) {
  // Filter non-JIRA tasks
  const nonJiraTasks = tasks.filter(task => !task.jira_key);
  
  if (nonJiraTasks.length === 0) {
    throw new Error('Keine Nicht-JIRA Tasks zum Exportieren vorhanden');
  }

  // Debug: Check what screenshot fields are available
  console.log('Excel Export - Task screenshot fields debug:', nonJiraTasks.map(task => ({
    id: task.id,
    title: task.title?.substring(0, 30) + '...',
    screenshot_url: task.screenshot_url || 'NULL',
    screenshot_display: task.screenshot_display || 'NULL',
    hasScreenshotUrl: !!task.screenshot_url,
    hasScreenshotDisplay: !!task.screenshot_display,
    allFields: Object.keys(task).filter(key => key.includes('screenshot'))
  })));

  // Prepare data for Excel - load R2 URLs for each task
  const excelData = await Promise.all(nonJiraTasks.map(async (task) => {
    // Format selected area if available
    let selectedArea = '';
    if (task.selected_area) {
      try {
        const areaData = typeof task.selected_area === 'string' 
          ? JSON.parse(task.selected_area) 
          : task.selected_area;
        selectedArea = `${Math.round(areaData.width)}×${Math.round(areaData.height)}px (Position: ${Math.round(areaData.x)}, ${Math.round(areaData.y)})`;
      } catch {
        selectedArea = 'Bereichs-Auswahl verfügbar';
      }
    }

    // Get screenshot URL - load real R2 URL
    let screenshotUrl = '';
    
    console.log(`Task ${task.id} - Screenshot URL detection:`, {
      screenshot_display: task.screenshot_display,
      screenshot_url: task.screenshot_url,
      willUseDisplay: !!task.screenshot_display,
      willUseUrl: !!task.screenshot_url && !task.screenshot_display,
      willCallEndpoint: !task.screenshot_display && !task.screenshot_url
    });
    
    // Priority: screenshot_display > screenshot_url > load from endpoint
    if (task.screenshot_display) {
      screenshotUrl = task.screenshot_display;
      console.log(`Task ${task.id} - Using screenshot_display: ${screenshotUrl}`);
    } else if (task.screenshot_url) {
      screenshotUrl = task.screenshot_url;
      console.log(`Task ${task.id} - Using screenshot_url: ${screenshotUrl}`);
    } else {
      // Load R2 URL from screenshot endpoint
      try {
        const response = await fetch(`/api/projects/${task.project_id}/tasks/${task.id}/screenshot`);
        if (response.ok) {
          const data = await response.json();
          console.log(`Task ${task.id} - Screenshot endpoint response:`, data);
          if (data.screenshot_url && data.screenshot_url.startsWith('http')) {
            screenshotUrl = data.screenshot_url;
            console.log(`Task ${task.id} - Got R2 URL from endpoint: ${screenshotUrl}`);
          } else {
            screenshotUrl = 'Kein R2-Screenshot verfügbar';
            console.log(`Task ${task.id} - No valid R2 URL from endpoint, got:`, data.screenshot_url);
          }
        } else {
          screenshotUrl = 'Screenshot-Endpoint nicht erreichbar';
        }
      } catch {
        screenshotUrl = 'Fehler beim Laden der Screenshot-URL';
      }
    }
    
    // If no screenshot URL found, mark as not available
    if (!screenshotUrl) {
      screenshotUrl = 'Kein Screenshot vorhanden';
    }

    // Format creation date
    const createdAt = new Date(task.created_at).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Status mapping
    const statusMapping = {
      'open': 'Offen',
      'in_progress': 'In Bearbeitung',
      'completed': 'Abgeschlossen'
    };

    return {
      'ID': task.id,
      'Titel': task.title || '',
      'Beschreibung': task.description || '',
      'Status': statusMapping[task.status] || task.status,
      'Seiten-URL': task.url || '',
      'Screenshot-Link': screenshotUrl,
      'Ausgewählter Bereich': selectedArea,
      'Erstellt am': createdAt
    };
  }));

  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // Set column widths
  const columnWidths = [
    { wch: 8 },   // ID
    { wch: 30 },  // Titel
    { wch: 50 },  // Beschreibung
    { wch: 15 },  // Status
    { wch: 40 },  // Seiten-URL
    { wch: 50 },  // Screenshot-Link
    { wch: 30 },  // Ausgewählter Bereich
    { wch: 20 }   // Erstellt am
  ];
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Nicht-JIRA Tasks');
  
  // Generate filename with current date
  const currentDate = new Date().toISOString().split('T')[0];
  const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_Tasks_${currentDate}.xlsx`;
  
  // Write file
  XLSX.writeFile(workbook, filename);
  
  return {
    filename,
    taskCount: nonJiraTasks.length
  };
}

export async function downloadExcel(tasks, projectName) {
  try {
    const result = await exportTasksToExcel(tasks, projectName);
    return {
      success: true,
      message: `Excel-Datei "${result.filename}" wurde heruntergeladen. ${result.taskCount} Tasks exportiert.`
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}