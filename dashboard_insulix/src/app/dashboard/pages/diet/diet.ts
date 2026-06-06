import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DietasService, DietaCatalogo } from '../../../services/dietas.service';
import { PatientsService } from '../../../services/patients.service';

interface PlanDieta {
  id: string;
  paciente: string;
  tipo: 'Hipocalórica' | 'Baja en carbohidratos' | 'Mediterránea' | 'DASH' | 'Cetogénica';
  calorias: number;
  adherencia: number; // porcentaje
  estado: 'activo' | 'pausado' | 'completado';
  ultimaActualizacion: string;
  comidas: number;
}

@Component({
  selector: 'app-diet',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatTableModule,
    MatMenuModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  templateUrl: './diet.html',
  styleUrl: './diet.scss',
})
export class Diet implements OnInit {
  private dietasService = inject(DietasService);
  private patientsService = inject(PatientsService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  viewMode: 'assignments' | 'catalog' = 'assignments';
  searchTerm: string = '';
  currentFilter: 'todos' | 'activo' | 'pausado' | 'completado' = 'todos';

  // Datos reales
  catalogo: DietaCatalogo[] = [];
  asignaciones: any[] = [];
  pacientes: any[] = [];

  // Modales/Forms
  showPlatilloForm: boolean = false;
  showAssignForm: boolean = false;
  platilloForm: FormGroup;
  assignForm: FormGroup;

  constructor() {
    this.platilloForm = this.fb.group({
      nombre_platillo: ['', Validators.required],
      categoria: ['Desayuno', Validators.required],
      platillo: ['', Validators.required],
      bebida: ['', Validators.required]
    });

    this.assignForm = this.fb.group({
      paciente_id: ['', Validators.required],
      dieta_id: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loadPacientes();
    this.loadCatalogo();
  }

  loadCatalogo() {
    this.dietasService.getCatalogo().subscribe(data => {
      this.catalogo = data;
      this.cdr.detectChanges();
    });
  }

  loadAsignaciones() {
    this.dietasService.getAsignaciones().subscribe(data => {
      this.asignaciones = data.map(asig => {
        const patient = this.pacientes.find(p => p.id === asig.paciente_id);
        return {
          ...asig,
          paciente_nombre: patient ? `${patient.nombre} ${patient.apellidos}` : `ID: ${asig.paciente_id}`
        };
      });
      this.cdr.detectChanges();
    });
  }

  loadPacientes() {
    this.patientsService.getPacientes().subscribe(data => {
      console.log('[DEBUG] Datos en bruto recibidos:', data);
      
      this.pacientes = data.map(p => ({
        id: p.paciente_id || p.usuario_id || p.uid, // Intentamos todos los posibles nombres del ID
        nombre: p.nombre,
        apellidos: `${p.apellido_paterno} ${p.apellido_materno || ''}`.trim()
      }));
      
      console.log('[DEBUG] Pacientes mapeados para el selector:', this.pacientes);
      
      this.loadAsignaciones();
      this.cdr.detectChanges();
    });
  }

  onPatientSelect(event: any) {
    console.log('[DEBUG] Paciente seleccionado (ID):', event.value);
  }

  setView(mode: 'assignments' | 'catalog') {
    this.viewMode = mode;
  }

  // --- Acciones de Catálogo ---
  savePlatillo() {
    if (this.platilloForm.invalid) return;
    this.dietasService.createPlatillo(this.platilloForm.value).subscribe(() => {
      this.loadCatalogo();
      this.showPlatilloForm = false;
      this.platilloForm.reset({ categoria: 'Desayuno' });
    });
  }

  deletePlatillo(id: string) {
    if (confirm('¿Eliminar este platillo del catálogo?')) {
      this.dietasService.deletePlatillo(id).subscribe(() => this.loadCatalogo());
    }
  }

  // --- Acciones de Asignación ---
  saveAsignacion() {
    if (this.assignForm.invalid) return;
    const { paciente_id, dieta_id } = this.assignForm.value;
    this.dietasService.assignDieta(paciente_id, dieta_id).subscribe(() => {
      this.loadAsignaciones();
      this.showAssignForm = false;
      this.assignForm.reset();
    });
  }

  // Getters para la tabla de asignaciones (mapeo)
  get planesFiltrados(): any[] {
    let filtrados = this.asignaciones;
    // Aquí podrías añadir filtros reales si el backend los soporta o filtrar localmente
    return filtrados;
  }

  displayedColumns: string[] = ['paciente', 'platillo', 'categoria', 'fecha', 'acciones'];
  catalogColumns: string[] = ['nombre', 'categoria', 'detalle', 'bebida', 'acciones'];

  setFilter(filter: 'todos' | 'activo' | 'pausado' | 'completado') {
    this.currentFilter = filter;
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'activo': return 'Activo';
      case 'pausado': return 'Pausado';
      case 'completado': return 'Completado';
      default: return estado;
    }
  }

  getAdherenciaClass(adherencia: number): string {
    if (adherencia >= 80) return 'alta';
    if (adherencia >= 60) return 'media';
    return 'baja';
  }
}
