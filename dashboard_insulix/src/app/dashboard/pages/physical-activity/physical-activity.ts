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
import { ActivityService, ActividadCatalogo, AsignacionActividad } from '../../../services/activity.service';
import { PatientsService } from '../../../services/patients.service';

@Component({
  selector: 'app-physical-activity',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatTableModule,
    MatMenuModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './physical-activity.html',
  styleUrl: './physical-activity.scss',
})
export class PhysicalActivity implements OnInit {
  private activityService = inject(ActivityService);
  private patientsService = inject(PatientsService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  viewMode: 'assignments' | 'catalog' = 'assignments';
  searchTerm: string = '';
  
  catalogo: ActividadCatalogo[] = [];
  asignaciones: AsignacionActividad[] = [];
  pacientes: any[] = [];

  showActivityFormValue = false;
  showAssignFormValue = false;

  activityForm: FormGroup;
  assignForm: FormGroup;

  displayedColumns: string[] = ['paciente', 'ejercicio', 'intensidad', 'duracion', 'fecha', 'acciones'];

  constructor() {
    this.activityForm = this.fb.group({
      nombre_ejercicio: ['', [Validators.required, Validators.minLength(3)]],
      duracion_min: [30, [Validators.required, Validators.min(1)]],
      intensidad: ['Moderada', Validators.required]
    });

    this.assignForm = this.fb.group({
      paciente_id: ['', Validators.required],
      actividad_id: ['', Validators.required],
      notas_medicas: [''],
      fecha: [new Date().toISOString().slice(0, 16), Validators.required]
    });
  }

  // Función crítica para que el mat-select reconozca la selección correctamente
  compareById(o1: any, o2: any): boolean {
    return o1 && o2 ? o1 === o2 : o1 === o2;
  }

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loadPacientes();
    this.loadCatalogo();
  }

  loadCatalogo() {
    this.activityService.getCatalogo().subscribe(data => {
      this.catalogo = data;
      this.cdr.detectChanges();
    });
  }

  loadAsignaciones() {
    this.activityService.getAsignaciones().subscribe(data => {
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
      this.pacientes = data.map(p => ({
        id: p.paciente_id || p.usuario_id || p.uid,
        nombre: p.nombre,
        apellidos: `${p.apellido_paterno} ${p.apellido_materno || ''}`.trim()
      }));
      this.loadAsignaciones();
      this.cdr.detectChanges();
    });
  }

  setView(mode: 'assignments' | 'catalog') {
    this.viewMode = mode;
  }

  // --- Modal Activity ---
  openActivityForm() { this.showActivityFormValue = true; }
  closeActivityForm() { this.showActivityFormValue = false; this.activityForm.reset({ duracion_min: 30, intensidad: 'Moderada' }); }

  saveActivity() {
    if (this.activityForm.invalid) return;
    this.activityService.createActividad(this.activityForm.value).subscribe(() => {
      this.loadCatalogo();
      this.closeActivityForm();
    });
  }

  deleteActivity(id: string) {
    if (confirm('¿Eliminar este ejercicio del catálogo?')) {
      this.activityService.deleteActividad(id).subscribe(() => this.loadCatalogo());
    }
  }

  // --- Modal Assign ---
  openAssignForm() { this.showAssignFormValue = true; }
  closeAssignForm() { this.showAssignFormValue = false; this.assignForm.reset({ fecha: new Date().toISOString().slice(0, 16) }); }

  saveAsignacion() {
    console.log('[DEBUG] Intentando guardar asignación...');
    console.log('[DEBUG] Estado del formulario:', this.assignForm.status);
    console.log('[DEBUG] Valores del formulario:', this.assignForm.value);
    
    if (this.assignForm.invalid) {
      console.warn('[DEBUG] El formulario es inválido. Errores:', this.assignForm.errors);
      // Mostramos los errores de cada campo en la consola
      Object.keys(this.assignForm.controls).forEach(key => {
        const controlErrors = this.assignForm.get(key)?.errors;
        if (controlErrors != null) {
          console.log(`[DEBUG] Campo "${key}" tiene errores:`, controlErrors);
        }
      });
      // A pesar de ser inválido, intentamos enviar para ver si el backend lo acepta o falla con algo útil
    }

    this.activityService.assignActividad(this.assignForm.value).subscribe({
      next: (res) => {
        console.log('[DEBUG] Asignación guardada con éxito:', res);
        this.loadAsignaciones();
        this.closeAssignForm();
      },
      error: (err) => {
        console.error('[DEBUG] Error al guardar asignación:', err);
      }
    });
  }

  deleteAsignacion(id: string) {
    if (confirm('¿Eliminar esta asignación?')) {
      this.activityService.deleteAsignacion(id).subscribe(() => this.loadAsignaciones());
    }
  }

  getActividadIcon(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t.includes('caminata')) return 'directions_walk';
    if (t.includes('correr')) return 'directions_run';
    if (t.includes('bicicleta')) return 'directions_bike';
    if (t.includes('nadar')) return 'pool';
    if (t.includes('yoga')) return 'self_improvement';
    return 'fitness_center';
  }

  onPatientSelect(event: any) {
    console.log('[DEBUG] Paciente seleccionado para actividad:', event.value);
  }
}
