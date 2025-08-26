import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColumnDef, createAngularTable } from '@tanstack/angular-table';
import { GenericPageComponent, GenericTab, Facet, CellAction } from '../../shared/components/generic-page/generic-page.component';
import { StatusBadgeComponent } from './components/status-badge/status-badge.component';

interface PersonRow {
  id: number;
  name: string;
  role: string;
  status: 'Active' | 'Invited' | 'Inactive';
  limit: number;
}

@Component({
  selector: 'app-example',
  imports: [CommonModule, GenericPageComponent],
  templateUrl: './example.component.html',
  styleUrl: './example.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExampleComponent {
  // Loading state
  protected readonly loading = signal(false);
  // Tabs (optional)
  protected readonly tabs: GenericTab[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'invited', label: 'Invited' },
  ];

  // Filters
  protected readonly facets: Facet[] = [
    { key: 'role', type: 'select', label: 'Role', options: [
      { label: 'All', value: '' },
      { label: 'Admin', value: 'Admin' },
      { label: 'Editor', value: 'Editor' },
      { label: 'Viewer', value: 'Viewer' },
    ]},
    { key: 'status', type: 'select', label: 'Status', options: [
      { label: 'All', value: '' },
      { label: 'Active', value: 'Active' },
      { label: 'Invited', value: 'Invited' },
      { label: 'Inactive', value: 'Inactive' },
    ]},
  ];

  // Demo data
  private readonly source = signal<PersonRow[]>([
    { id: 1, name: 'Eddie Lake', role: 'Admin', status: 'Active', limit: 5 },
    { id: 2, name: 'Jamik Tashpulatov', role: 'Editor', status: 'Active', limit: 8 },
    { id: 3, name: 'Ava Sund', role: 'Viewer', status: 'Invited', limit: 13 },
    { id: 4, name: 'Noah Ring', role: 'Viewer', status: 'Inactive', limit: 21 },
    { id: 5, name: 'Aria Han', role: 'Editor', status: 'Active', limit: 24 },
    { id: 6, name: 'Cole Park', role: 'Admin', status: 'Active', limit: 10 },
    { id: 7, name: 'Liam Yu', role: 'Viewer', status: 'Invited', limit: 16 },
    { id: 8, name: 'Maya Chen', role: 'Editor', status: 'Active', limit: 27 },
  ]);

  // Columns
  protected readonly columns: ColumnDef<PersonRow, any>[] = [
    { accessorKey: 'name', header: 'Header' },
    { accessorKey: 'role', header: 'Section Type' },
            {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: false,
      meta: {
        cellComponent: StatusBadgeComponent,
        cellComponentData: (row: PersonRow) => ({ status: row.status }),
      },
    },
    { accessorKey: 'limit', header: 'Limit' },
        {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: (info) => '',
      meta: {
        actions: [
          { key: 'edit', label: 'Edit' },
          { key: 'delete', label: 'Delete', class: 'text-error' },
        ] as CellAction[],
      },
    },
  ];

  // Data fetching and filtering
  private readonly activeTab = signal<string>('all');
  private readonly search = signal<string>('');
  private readonly facetState = signal<Record<string, string>>({});
  protected readonly data = signal<PersonRow[]>([]);

  constructor() {
    this.fetchData();
  }

  private fetchData() {
    this.loading.set(true);

    // Simulate API call
    setTimeout(() => {
      const term = this.search().toLowerCase();
      const facets = this.facetState();
      const tab = this.activeTab();

      const filteredData = this.source().filter(r => {
        const matchesSearch = !term || Object.values(r).some(v => String(v).toLowerCase().includes(term));
        const roleOk = !facets['role'] || r.role === facets['role'];
        const statusOk = !facets['status'] || r.status === (facets['status'] as any);
        const tabOk = tab === 'all' || r.status.toLowerCase() === tab;
        return matchesSearch && roleOk && statusOk && tabOk;
      });

      this.data.set(filteredData);
      this.loading.set(false);
    }, 500); // 500ms delay to simulate network latency
  }

  // Header actions
  protected readonly subtitle = 'Manage your product catalog and inventory';
  protected readonly primaryAction = { label: 'Add Product', icon: 'M12 4.5v15m7.5-7.5h-15' };
  onPrimaryActionClick() {
    // In a real app, you'd open a modal or navigate to a new page
    alert('"Add Product" button clicked!');
  }

  // Event handlers from GenericPageComponent
  onTabChange = (key: string | null) => {
    this.activeTab.set(key ?? 'all');
    this.fetchData();
  };

  onFiltersChange = (f: { search: string; facets: Record<string, string> }) => {
    this.search.set(f.search);
    this.facetState.set(f.facets);
    this.fetchData();
  };

  onCellAction(event: { action: string; row: PersonRow }) {
    // In a real app, you'd open a modal, navigate, or call a service
    alert(`Action: '${event.action}' on row:
${JSON.stringify(event.row, null, 2)}`);
  }
}
