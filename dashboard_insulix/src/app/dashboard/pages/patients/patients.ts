import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PatientsModalComponent } from '../../components/patients-modal/patients-modal.component';
import { PatientsService } from '../../../services/patients.service';

interface Patient {
  id: string; // Changed to UUID string
  nombre: string;
  apellidos: string;
  edad: number;
  sexo: 'M' | 'F' | 'Otro';
  tipo_diabetes: 'Tipo 1' | 'Tipo 2' | 'Gestacional' | 'Otro';
  glucosa_base: number;
  telefono: string;
  foto_url: string;

  // Campos adicionales para la vista
  estado: 'alto' | 'estable' | 'bajo'; // Calculado basado en la última lectura vs glucosa_base
  ultima_lectura_valor: number;
  ultima_lectura_fecha: string;
  tendencia: 'subiendo' | 'estable' | 'bajando';
  tratamiento_activo: string;
}

@Component({
  selector: 'app-patients',
  standalone: true,
  templateUrl: './patients.html',
  styleUrl: './patients.scss',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatTableModule,
    MatCheckboxModule,
    PatientsModalComponent
  ],
})
export class Patients implements OnInit {
  private patientsService = inject(PatientsService);
  private cdr = inject(ChangeDetectorRef);
  
  private _searchTerm: string = '';
  get searchTerm(): string { return this._searchTerm; }
  set searchTerm(value: string) {
    this._searchTerm = value;
    this.currentPage = 1;
  }

  currentFilter: 'todos' | 'alto' | 'estable' | 'bajo' = 'todos';
  currentPage: number = 1;
  itemsPerPage: number = 8;

  // Selección masiva (checkboxes)
  selectedPatientIds = new Set<string>();

  // Paciente activo (detalle) — se activa al clic en fila
  activePatient: Patient | null = null;

  // Modal de registro de pacientes
  showModal: boolean = false;

  // Sidebar
  sidebarOpen: boolean = false;
  recentPatients: Patient[] = []; // últimos pacientes vistos

  displayedColumns: string[] = ['select', 'paciente', 'edad', 'glucosa', 'estado', 'ultima_lectura_fecha'];

  pacientes: Patient[] = [];

  ngOnInit(): void {
    this.loadPacientes();
  }

  loadPacientes() {
    this.patientsService.getPacientes().subscribe({
      next: (data: any[]) => {
        console.log('Pacientes recibidos del backend:', data);
        this.pacientes = data.map(item => ({
          id: item.usuario_id,
          nombre: item.nombre,
          apellidos: `${item.apellido_paterno} ${item.apellido_materno || ''}`.trim(),
          edad: this.calcularEdadVisual(item.fecha_nacimiento),
          sexo: item.sexo,
          tipo_diabetes: item.tipo_diabetes,
          glucosa_base: item.glucosa_base,
          telefono: item.telefono,
          foto_url: item.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.nombre)}+${encodeURIComponent(item.apellido_paterno)}&background=0D8ABC&color=fff&size=500`,
          estado: this.calcularEstado(item.glucosa_base),
          ultima_lectura_valor: item.glucosa_base || 0,
          ultima_lectura_fecha: 'Inicial',
          tendencia: 'estable' as any,
          tratamiento_activo: 'Pendiente'
        }));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando pacientes:', err);
      }
    });
  }

  // Getters computados
  get filteredPatientsComplete(): Patient[] {
    let filtrados = this.pacientes;
    if (this.currentFilter !== 'todos') {
      filtrados = filtrados.filter(p => p.estado === this.currentFilter);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtrados = filtrados.filter(p => 
        p.nombre.toLowerCase().includes(term) || 
        p.apellidos.toLowerCase().includes(term)
      );
    }
    return filtrados;
  }

  get totalPages(): number {
    return Math.ceil(this.filteredPatientsComplete.length / this.itemsPerPage) || 1;
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get pacientesFiltrados(): Patient[] {
    const list = this.filteredPatientsComplete;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return list.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get selectedCount(): number {
    return this.selectedPatientIds.size;
  }

  get showDetail(): boolean {
    return this.activePatient !== null;
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  // Acciones
  setFilter(filter: 'todos' | 'alto' | 'estable' | 'bajo') {
    this.currentFilter = filter;
    this.currentPage = 1;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) { this.currentPage++; }
  }

  prevPage() {
    if (this.currentPage > 1) { this.currentPage--; }
  }

  // Clic en fila de tabla → abrir detalle directamente (1 clic)
  onRowClick(patient: Patient, event: Event) {
    // No abrir detalle si se hizo clic en el checkbox
    const target = event.target as HTMLElement;
    if (target.closest('mat-checkbox') || target.closest('.mat-mdc-checkbox')) {
      return;
    }
    this.selectPatient(patient);
  }

  selectPatient(patient: Patient) {
    if (this.activePatient?.id === patient.id) {
      this.activePatient = null;
    } else {
      this.activePatient = patient;
      // Agregar a recientes (sin duplicados, máximo 8)
      this.addToRecent(patient);
    }
  }

  addToRecent(patient: Patient) {
    this.recentPatients = [
      patient,
      ...this.recentPatients.filter(p => p.id !== patient.id),
    ].slice(0, 8);
  }

  // Checkboxes para selección masiva
  toggleSelection(patient: Patient) {
    if (this.selectedPatientIds.has(patient.id)) {
      this.selectedPatientIds.delete(patient.id);
    } else {
      this.selectedPatientIds.add(patient.id);
    }
  }

  isSelected(patient: Patient): boolean {
    return this.selectedPatientIds.has(patient.id);
  }

  isAllSelected(): boolean {
    return this.pacientesFiltrados.length > 0 &&
      this.pacientesFiltrados.every(p => this.selectedPatientIds.has(p.id));
  }

  toggleAllSelection() {
    if (this.isAllSelected()) {
      this.pacientesFiltrados.forEach(p => this.selectedPatientIds.delete(p.id));
    } else {
      this.pacientesFiltrados.forEach(p => this.selectedPatientIds.add(p.id));
    }
  }

  clearSelection() {
    this.selectedPatientIds.clear();
  }

  // Sidebar: seleccionar desde recientes
  selectFromSidebar(patient: Patient) {
    this.selectPatient(patient);
  }

  removeFromRecent(patient: Patient, event: Event) {
    event.stopPropagation();
    this.recentPatients = this.recentPatients.filter(p => p.id !== patient.id);
    if (this.activePatient?.id === patient.id) {
      this.activePatient = null;
    }
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'alto': return 'Alto';
      case 'estable': return 'Estable';
      case 'bajo': return 'Bajo';
      default: return estado;
    }
  }

  getTendenciaIcon(tendencia: string): string {
    switch (tendencia) {
      case 'subiendo': return 'trending_up';
      case 'bajando': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  // ==== MODAL DE REGISTRO ====
  openModal() {
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  onPatientCreated(nuevoPaciente: any) {
    // Calcular edad dinámicamente según la fecha de nacimiento ingresada
    const edadVisual = this.calcularEdadVisual(nuevoPaciente.fecha_nacimiento);
    
    // Crear objeto con la estructura de la tabla
    const row = {
      id: nuevoPaciente.paciente_id || nuevoPaciente.uid || Math.random().toString(),
      nombre: nuevoPaciente.nombre || '',
      apellidos: `${nuevoPaciente.apellido_paterno} ${nuevoPaciente.apellido_materno || ''}`.trim(),
      edad: edadVisual,
      sexo: nuevoPaciente.sexo || 'M',
      tipo_diabetes: nuevoPaciente.tipo_diabetes || 'Desconocido',
      glucosa_base: nuevoPaciente.glucosa_base || 0,
      telefono: nuevoPaciente.telefono || '',
      foto_url: nuevoPaciente.foto_url || 'https://i.pravatar.cc/150',
      estado: this.calcularEstado(nuevoPaciente.glucosa_base),
      ultima_lectura_valor: nuevoPaciente.glucosa_base || 0,
      ultima_lectura_fecha: 'Hoy',
      tendencia: 'estable' as any,
      tratamiento_activo: 'Pendiente'
    };

    // Insertar al inicio de la lista local para que se vea reflejado inmediatamente
    this.pacientes = [row, ...this.pacientes];
    this.cdr.detectChanges();
  }

  private calcularEstado(valor: number): 'alto' | 'estable' | 'bajo' {
    if (!valor) return 'estable';
    if (valor > 180) return 'alto';
    if (valor < 70) return 'bajo';
    return 'estable';
  }

  private calcularEdadVisual(fecha_nacimiento: string): number {
    if (!fecha_nacimiento) return 0;
    const dob = new Date(fecha_nacimiento);
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms); 
    return Math.abs(age_dt.getUTCFullYear() - 1970);
  }
}


