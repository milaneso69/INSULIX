import { Component, EventEmitter, Output, inject, ChangeDetectorRef, OnDestroy, Injector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PatientsService } from '../../../services/patients.service';

// Importaciones de Firebase para creación "Silenciosa"
import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from '@angular/fire/app';
import { getAuth, createUserWithEmailAndPassword, Auth } from '@angular/fire/auth';
import { firebaseConfig } from '../../../app.config';

/**
 * DATOS DE UBICACIÓN (OPCIÓN B: OFFLINE)
 * Mapa de estados y sus ciudades principales para autocompletado rápido.
 */
const MEXICO_LOCATIONS: { [key: string]: string[] } = {
  'Aguascalientes': ['Aguascalientes', 'Rincón de Romos', 'Pabellón de Arteaga', 'Jesús María'],
  'Baja California': ['Tijuana', 'Mexicali', 'Ensenada', 'Tecate', 'Rosarito'],
  'Baja California Sur': ['La Paz', 'Los Cabos', 'Ciudad Constitución', 'Santa Rosalía'],
  'Campeche': ['Campeche', 'Ciudad del Carmen', 'Champotón', 'Escárcega'],
  'Chiapas': ['Tuxtla Gutiérrez', 'Tapachula', 'San Cristóbal', 'Comitán', 'Palenque'],
  'Chihuahua': ['Chihuahua', 'Ciudad Juárez', 'Cuauhtémoc', 'Delicias', 'Parral'],
  'Ciudad de México': ['Álvaro Obregón', 'Benito Juárez', 'Coyoacán', 'Cuauhtémoc', 'Iztapalapa', 'Polanco', 'Santa Fe', 'Tlalpan'],
  'Coahuila': ['Saltillo', 'Torreón', 'Monclova', 'Piedras Negras', 'Acuña'],
  'Colima': ['Colima', 'Manzanillo', 'Villa de Álvarez', 'Tecomán'],
  'Durango': ['Durango', 'Gómez Palacio', 'Lerdo', 'Pueblo Nuevo'],
  'Estado de México': ['Toluca', 'Naucalpan', 'Tlalnepantla', 'Ecatepec', 'Nezahualcóyotl', 'Metepec', 'Huixquilucan'],
  'Guanajuato': ['León', 'Irapuato', 'Celaya', 'Salamanca', 'Guanajuato', 'San Miguel de Allende'],
  'Guerrero': ['Chilpancingo', 'Acapulco', 'Iguala', 'Taxco', 'Zihuatanejo'],
  'Hidalgo': ['Pachuca', 'Tulancingo', 'Tula', 'Ixmiquilpan', 'Mineral de la Reforma'],
  'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonalá', 'Puerto Vallarta', 'Lagos de Moreno'],
  'Michoacán': ['Morelia', 'Uruapan', 'Zamora', 'Lázaro Cárdenas', 'Pátzcuaro'],
  'Morelos': ['Cuernavaca', 'Cuautla', 'Jiutepec', 'Temixco'],
  'Nayarit': ['Tepic', 'Bahía de Banderas', 'Compostela', 'Santiago Ixcuintla'],
  'Nuevo León': ['Monterrey', 'Guadalupe', 'San Pedro Garza García', 'San Nicolás', 'Apodaca', 'Escobedo'],
  'Oaxaca': ['Oaxaca de Juárez', 'San Juan Bautista Tuxtepec', 'Salina Cruz', 'Juchitán'],
  'Puebla': ['Puebla', 'Tehuacán', 'San Andrés Cholula', 'Atlixco', 'Huauchinango'],
  'Querétaro': ['Querétaro', 'San Juan del Río', 'Corregidora', 'El Marqués'],
  'Quintana Roo': ['Cancún', 'Playa del Carmen', 'Cozumel', 'Chetumal', 'Tulum'],
  'San Luis Potosí': ['San Luis Potosí', 'Soledad de Graciano Sánchez', 'Ciudad Valles', 'Matehuala'],
  'Sinaloa': ['Culiacán', 'Mazatlán', 'Los Mochis', 'Guasave', 'Navolato'],
  'Sonora': ['Hermosillo', 'Ciudad Obregón', 'Nogales', 'San Luis Río Colorado', 'Navojoa'],
  'Tabasco': ['Villahermosa', 'Cárdenas', 'Comalcalco', 'Huimanguillo'],
  'Tamaulipas': ['Ciudad Victoria', 'Reynosa', 'Matamoros', 'Nuevo Laredo', 'Tampico'],
  'Tlaxcala': ['Tlaxcala', 'Apizaco', 'Huamantla', 'Chiautempan'],
  'Veracruz': ['Veracruz', 'Xalapa', 'Coatzacoalcos', 'Orizaba', 'Boca del Río', 'Córdoba'],
  'Yucatán': ['Mérida', 'Kanasín', 'Valladolid', 'Tizimín', 'Progreso'],
  'Zacatecas': ['Zacatecas', 'Fresnillo', 'Guadalupe', 'Jerez', 'Sombrerete']
};

@Component({
  selector: 'app-patients-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './patients-modal.component.html',
  styleUrls: ['./patients-modal.component.scss']
})
export class PatientsModalComponent implements OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() patientCreated = new EventEmitter<any>();

  private fb = inject(FormBuilder);
  private patientsService = inject(PatientsService);
  private cdr = inject(ChangeDetectorRef);
  private injector = inject(Injector);

  patientForm: FormGroup;
  estados = Object.keys(MEXICO_LOCATIONS);
  ciudadesFiltradas: string[] = [];
  isSubmitting = false;

  // Firebase Secondary App variables
  private secondaryApp: FirebaseApp | null = null;
  private secondaryAuth: Auth | null = null;

  constructor() {
    this.patientForm = this.fb.group({
      // Datos Personales
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellidoPaterno: ['', Validators.required],
      apellidoMaterno: [''],
      fechaNacimiento: ['', Validators.required],
      sexo: ['M', Validators.required],
      tipoDiabetes: ['Tipo 1', Validators.required],
      glucosaBase: [100, [Validators.required, Validators.min(40), Validators.max(500)]],
      peso: [70, [Validators.required, Validators.min(1), Validators.max(300)]],
      estatura: [1.70, [Validators.required, Validators.min(0.5), Validators.max(2.5)]],
      
      // Ubicación
      calle1: ['', [Validators.required, Validators.maxLength(100)]],
      calle2: ['', Validators.maxLength(100)],
      cp: ['', [Validators.required, Validators.pattern('^[0-9]{5}$')]],
      estado: [{ value: '', disabled: true }, Validators.required],
      ciudad: [{ value: '', disabled: true }, Validators.required],

      // Contacto y Seguridad
      telefono: ['', [Validators.required, Validators.pattern('^[0-9]{3}-[0-9]{3}-[0-9]{4}$')]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.matchPasswords });

    this.setupLocationListeners();
    this.initSecondaryApp();
  }

  // Inicializar Firebase Secondary para evitar cerrar sesión del médico
  private initSecondaryApp() {
    try {
      const apps = getApps();
      const existingApp = apps.find(app => app.name === 'SecondaryPatientCreator');
      
      if (existingApp) {
        this.secondaryApp = existingApp;
      } else {
        this.secondaryApp = initializeApp(firebaseConfig, 'SecondaryPatientCreator');
      }
      this.secondaryAuth = getAuth(this.secondaryApp);
    } catch (e) {
      console.error('Error inicializando Secondary Firebase App:', e);
    }
  }

  // Limpiar la instancia secundaria cuando se destruya el componente
  ngOnDestroy() {
    if (this.secondaryApp) {
      // Opcional: deleteApp(this.secondaryApp); pero puede ser costoso recrearla seguido.
      this.secondaryAuth?.signOut();
    }
  }

  // Validador de contraseña (Mayúscula, minúscula, número)
  private passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const isValid = hasUpperCase && hasLowerCase && hasNumber;
    return !isValid ? { passwordWeak: true } : null;
  }

  // Validador de confirmación
  private matchPasswords(group: AbstractControl): ValidationErrors | null {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { notMatching: true };
  }

  private setupLocationListeners() {
    this.patientForm.get('cp')?.valueChanges.subscribe(cp => {
      if (cp && cp.length === 5) {
        this.autofillFromCP(cp);
      }
    });

    this.patientForm.get('estado')?.valueChanges.subscribe(estado => {
      if (estado) {
        this.ciudadesFiltradas = MEXICO_LOCATIONS[estado] || [];
        this.patientForm.get('ciudad')?.enable();
        this.patientForm.get('ciudad')?.setValue('');
      } else {
        this.patientForm.get('ciudad')?.disable();
      }
    });
  }

  private autofillFromCP(cp: string) {
    const prefix = parseInt(cp.substring(0, 2));
    let detectedEstado = '';

    if (prefix >= 1 && prefix <= 16) detectedEstado = 'Ciudad de México';
    else if (prefix >= 50 && prefix <= 57) detectedEstado = 'Estado de México';
    else if (prefix >= 44 && prefix <= 45) detectedEstado = 'Jalisco';
    else if (prefix >= 64 && prefix <= 67) detectedEstado = 'Nuevo León';
    else if (prefix >= 76) detectedEstado = 'Querétaro';
    
    setTimeout(() => {
      this.patientForm.get('estado')?.enable();
      if (detectedEstado) {
        this.patientForm.get('estado')?.setValue(detectedEstado);
      }
      this.cdr.detectChanges();
    });
  }

  increment(field: string, step: number) {
    const control = this.patientForm.get(field);
    if (control) {
      const newVal = parseFloat((control.value + step).toFixed(2));
      control.setValue(newVal);
    }
  }

  decrement(field: string, step: number) {
    const control = this.patientForm.get(field);
    if (control) {
      const newVal = parseFloat((control.value - step).toFixed(2));
      control.setValue(newVal);
    }
  }

  onPhoneInput(event: any) {
    let val = event.target.value.replace(/\D/g, '');
    if (val.length > 10) val = val.substring(0, 10);
    
    let formatted = val;
    if (val.length > 3) formatted = val.substring(0, 3) + '-' + val.substring(3);
    if (val.length > 6) formatted = val.substring(0, 3) + '-' + val.substring(3, 6) + '-' + val.substring(6, 10);
    this.patientForm.get('telefono')?.setValue(formatted, { emitEvent: false });
  }

  async onSubmit() {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const rawData = this.patientForm.getRawValue();

    try {
      // 1. Crear el usuario en Firebase (Sin cerrar sesión del médico)
      if (!this.secondaryAuth) {
        throw new Error('No se pudo inicializar Firebase Secundario');
      }

      const userCredential = await runInInjectionContext(this.injector, () => 
        createUserWithEmailAndPassword(
          this.secondaryAuth!, 
          rawData.email, 
          rawData.password
        )
      );
      
      const newUid = userCredential.user.uid;

      // Cerramos sesión en la app secundaria rápidamente
      await this.secondaryAuth.signOut();

      // 2. Enviar a Postgres
      const direccionCompleta = `${rawData.calle1} ${rawData.calle2 ? 'y ' + rawData.calle2 : ''}, CP ${rawData.cp}, ${rawData.ciudad}, ${rawData.estado}`.trim();

      const payload = {
        uid: newUid,
        email: rawData.email,
        password: rawData.password,
        nombre: rawData.nombre,
        apellido_paterno: rawData.apellidoPaterno,
        apellido_materno: rawData.apellidoMaterno,
        fecha_nacimiento: rawData.fechaNacimiento,
        sexo: rawData.sexo,
        tipo_diabetes: rawData.tipoDiabetes,
        glucosa_base: rawData.glucosaBase,
        peso: rawData.peso,
        estatura: rawData.estatura,
        telefono: rawData.telefono,
        direccion: direccionCompleta
      };
      
      console.log('Enviando payload al backend:', payload);

      this.patientsService.createPaciente(payload).subscribe({
        next: (res: any) => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
          this.patientCreated.emit(res.detalle);
          this.close.emit();
        },
        error: (err: any) => {
          console.error('Error creando paciente BD:', err);
          const detalleBackend = (err.error as any)?.details || JSON.stringify(err.error);
          alert('Hubo un error al registrar el paciente en la BD:\n' + detalleBackend);
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
      
    } catch (fbError: any) {
      console.error("Error FirebaseAuth:", fbError);
      if (fbError.code === 'auth/email-already-in-use') {
        alert('Este correo electrónico ya está registrado en Firebase.');
      } else {
        alert('Hubo un error al crear la cuenta en Firebase: ' + fbError.message);
      }
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }
}
