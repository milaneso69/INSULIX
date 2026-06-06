import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatListModule, 
    MatButtonModule, 
    MatMenuModule, 
    MatTableModule,
    MatTooltipModule
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit {
  authService = inject(AuthService);
  // Datos simulados para las alertas, ampliados para mayor realismo
  alertas = [
    { paciente: 'Juan Pérez', valor: 280, tipo: 'Hiperglucemia', tiempo: 'Hace 15 min', severidad: 'rojo' },
    { paciente: 'María García', valor: 55, tipo: 'Hipoglucemia', tiempo: 'Hace 5 min', severidad: 'naranja' },
    { paciente: 'Roberto Gómez', valor: 210, tipo: 'Hiperglucemia', tiempo: 'Hace 1h', severidad: 'rojo' },
    { paciente: 'Carmen Salas', valor: 105, tipo: 'Estable', tiempo: 'Hace 2h', severidad: 'verde' }
  ];

  // Datos para la tabla de ranking de riesgo
  rankingPacientes = [
    { nombre: 'Elena Torres', cantidad: 8, tendencia: 'sube' },
    { nombre: 'María García', cantidad: 6, tendencia: 'sube' },
    { nombre: 'Juan Pérez', cantidad: 5, tendencia: 'estable' },
    { nombre: 'Carlos Ruiz', cantidad: 4, tendencia: 'baja' },
    { nombre: 'Ana Beltrán', cantidad: 3, tendencia: 'estable' }
  ];

  ngOnInit(): void {
    // Inicialización del componente
  }
}