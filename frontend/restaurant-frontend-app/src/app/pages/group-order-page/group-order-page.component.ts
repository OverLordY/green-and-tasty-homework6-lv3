import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { EMPTY, Observable, Subscription, catchError, exhaustMap, finalize, forkJoin, interval, map, switchMap, tap } from 'rxjs';
import { ParticipantCardComponent } from '../../components/group-orders/participant-card/participant-card.component';
import { Participant } from '../../models/group-orders/participant.model';
import { GroupReservationStatus } from '../../models/group-orders/group-status.model';
import { GuestInvite } from '../../models/reservations/guest-invite.model';
import { GroupOrdersService } from '../../services/group-orders/group-orders.service';
import { ToastService } from '../../services/toast/toast.service';
import { ModalComponent } from '../../shared/custom-components/modal/modal.component';
import { consolidatePreOrder } from '../../shared/helpers/consolidate-pre-order';

@Component({
  selector: 'app-group-order-page',
  imports: [CurrencyPipe, DatePipe, ParticipantCardComponent, ModalComponent],
  templateUrl: './group-order-page.component.html',
  styleUrl: './group-order-page.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class GroupOrderPageComponent implements OnInit {
  private readonly service = inject(GroupOrdersService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private polling?: Subscription;
  private loadingRequest?: Subscription;
  private mutationRequest?: Subscription;
  private refreshRequest?: Subscription;
  private generation = 0;
  reservationId = this.route.snapshot.paramMap.get('reservationId') ?? '';
  readonly invite = signal<GuestInvite | null>(null);
  readonly participants = signal<Participant[]>([]);
  readonly ownerSessionId = signal('');
  readonly status = signal<GroupReservationStatus>('Open');
  readonly loading = signal(true);
  readonly error = signal('');
  readonly submitting = signal(false);
  readonly removing = signal(false);
  readonly refreshing = signal(false);
  readonly refreshError = signal(false);
  readonly updatedAt = signal<Date | null>(null);
  readonly submitDialog = signal(false);
  readonly selectedGuest = signal<Participant | null>(null);
  readonly consolidated = computed(() => consolidatePreOrder(this.participants()));
  readonly pendingCount = computed(() => this.participants().filter((person) => !person.isSubmitted).length);
  readonly hasDishes = computed(() => this.participants().some((person) => person.items.length > 0));
  readonly isOpen = computed(() => this.status() === 'Open');
  readonly canSubmit = computed(() => this.isOpen() && this.consolidated().items.length > 0 && !this.submitting() && !this.removing() && !this.refreshing());

  ngOnInit(): void {
    this.load();
    this.route.paramMap?.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((parameters) => {
      const reservationId = parameters.get('reservationId') ?? '';
      if (reservationId !== this.reservationId) {
        this.reservationId = reservationId;
        this.invite.set(null);
        this.participants.set([]);
        this.submitDialog.set(false);
        this.selectedGuest.set(null);
        this.load();
      }
    });
  }

  load(): void {
    this.generation++;
    this.mutationRequest?.unsubscribe();
    this.polling?.unsubscribe();
    this.refreshRequest?.unsubscribe();
    this.loadingRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.loadingRequest = this.service.getGroupInvite$(this.reservationId).pipe(
      switchMap((invite) => forkJoin({
        invite: [invite],
        sessions: this.service.getSessions$(invite.GroupReservationId),
        owner: this.service.getOwnerSessionId$(this.reservationId),
        status: this.service.getStatus$(invite.GroupReservationId),
      })),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (data) => {
        this.invite.set(data.invite);
        this.participants.set(data.sessions.participants);
        this.ownerSessionId.set(data.owner);
        this.status.set(data.status.status);
        this.updatedAt.set(new Date());
        this.refreshError.set(false);
        this.startPolling();
      },
      error: (error: HttpErrorResponse) => this.error.set(error.status === 404 ? 'Group reservation not found' : 'Could not load the group pre-order.'),
    });
  }

  private startPolling(): void {
    this.polling?.unsubscribe();
    if (!this.isOpen()) return;
    this.polling = interval(15_000).pipe(
      exhaustMap(() => this.refreshSnapshot()),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  private refreshSnapshot(): Observable<void> {
    const invite = this.invite();
    if (!invite || !this.isOpen() || this.refreshing() || this.submitting() || this.removing()) return EMPTY;
    const generation = this.generation;
    this.refreshing.set(true);
    return forkJoin({
      sessions: this.service.getSessions$(invite.GroupReservationId, { silent: true }),
      status: this.service.getStatus$(invite.GroupReservationId, { silent: true }),
    }).pipe(
      tap((data) => {
        if (generation !== this.generation) return;
        this.participants.set(data.sessions.participants);
        this.status.set(data.status.status);
        this.updatedAt.set(new Date());
        this.refreshError.set(false);
        if (!this.isOpen()) {
          this.polling?.unsubscribe();
          this.submitDialog.set(false);
          this.selectedGuest.set(null);
        }
      }),
      map(() => undefined),
      catchError(() => { this.refreshError.set(true); return EMPTY; }),
      finalize(() => this.refreshing.set(false)),
    );
  }

  refresh(): void {
    if (this.refreshing() || !this.isOpen() || this.submitting() || this.removing()) return;
    this.refreshRequest = this.refreshSnapshot().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  openSubmit(): void { if (this.canSubmit()) this.submitDialog.set(true); }
  closeSubmit(): void { if (!this.submitting()) this.submitDialog.set(false); }

  submit(): void {
    const invite = this.invite();
    if (!invite || !this.canSubmit()) return;
    this.generation++;
    this.submitting.set(true);
    this.polling?.unsubscribe();
    this.refreshRequest?.unsubscribe();
    this.mutationRequest = this.service.submit$(invite.GroupReservationId, this.reservationId).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.submitting.set(false)),
    ).subscribe({
      next: () => {
        this.status.set('Submitted');
        this.submitDialog.set(false);
        this.selectedGuest.set(null);
        this.toast.success('Pre-order sent to the restaurant');
      },
      error: () => { this.submitDialog.set(false); this.startPolling(); },
    });
  }

  chooseRemoval(person: Participant): void {
    if (this.isOpen() && person.type === 'Guest' && !this.submitting() && !this.removing() && !this.refreshing()) this.selectedGuest.set(person);
  }
  closeRemoval(): void { if (!this.removing()) this.selectedGuest.set(null); }

  removeGuest(): void {
    const invite = this.invite();
    const guest = this.selectedGuest();
    if (!invite || !guest || !this.isOpen() || this.removing() || this.submitting()) return;
    this.generation++;
    this.removing.set(true);
    this.polling?.unsubscribe();
    this.refreshRequest?.unsubscribe();
    this.mutationRequest = this.service.removeSession$(invite.GroupReservationId, guest.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.removing.set(false); this.startPolling(); }),
    ).subscribe({
      next: (response) => {
        this.participants.set(response.participants);
        this.updatedAt.set(new Date());
        this.selectedGuest.set(null);
        this.toast.success('Guest removed from the reservation');
      },
      error: () => this.selectedGuest.set(null),
    });
  }
}
