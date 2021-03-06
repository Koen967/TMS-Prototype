import { State, Action, StateContext, Selector } from '@ngxs/store';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';

import * as TruckActions from '../actions/truck.actions';

import { Truck } from '../../../../models/truck.model';
import { TruckDataService } from '../../truck-data.service';
import { DialogService } from '../../../../dialog/dialog.service';

export class TruckStateModel {
  trucks: { [id: number]: Truck };
  limit: number;
  offset: number;
  order: string;
  filters: any;
  total: number;
  loading: boolean;
  loaded: boolean;
}

@State<TruckStateModel>({
  name: 'truck',
  defaults: {
    trucks: {},
    limit: 25,
    offset: 0,
    order: null,
    filters: null,
    total: 0,
    loading: false,
    loaded: false
  }
})
export class TruckState {
  constructor(
    private service: TruckDataService,
    private dialogService: DialogService
  ) {}

  @Selector()
  static trucksLoaded(state: TruckStateModel) {
    return state.loaded;
  }

  @Selector()
  static trucksArray(state: TruckStateModel) {
    return Object.keys(state.trucks).map(id => state.trucks[id]);
  }

  @Selector()
  static gridData(state: TruckStateModel) {
    return {
      data: Object.keys(state.trucks).map(id => state.trucks[id]),
      totalCount: state.total
    };
  }

  @Action(TruckActions.GetData)
  getData(ctx: StateContext<TruckStateModel>, action: TruckActions.GetData) {
    ctx.patchState({
      loading: true,
      limit: action.limit,
      offset: action.offset,
      order: action.order,
      filters: action.filter
    });

    return this.service
      .getTrucksWithParams(
        action.limit,
        action.offset,
        action.order,
        action.filter
      )
      .pipe(
        map(trucks => ctx.dispatch(new TruckActions.GetDataSuccess(trucks))),
        catchError(error => ctx.dispatch(new TruckActions.GetDataFailed(error)))
      );
  }

  @Action(TruckActions.GetDataSuccess)
  getDataSucces(
    ctx: StateContext<TruckStateModel>,
    action: TruckActions.GetDataSuccess
  ) {
    const state = ctx.getState();
    state.trucks = null;
    const entities = action.trucks.reduce(
      (truckEntities: { [id: number]: Truck }, truck: Truck) => {
        return {
          ...truckEntities,
          [truck.id]: truck
        };
      },
      {
        ...state.trucks
      }
    );
    ctx.patchState({
      trucks: entities,
      loading: false,
      loaded: true
    });
  }

  @Action(TruckActions.GetDataFailed)
  getDataFailed(
    ctx: StateContext<TruckStateModel>,
    action: TruckActions.GetDataFailed
  ) {
    ctx.patchState({
      loading: false,
      loaded: false
    });

    this.dialogService.openDialog('Error', action.error);
  }

  @Action(TruckActions.GetTotalRows)
  getTotalRows(
    ctx: StateContext<TruckStateModel>,
    action: TruckActions.GetTotalRows
  ) {
    return this.service
      .getRowCount(action.filter)
      .pipe(
        map(amount =>
          ctx.dispatch(new TruckActions.GetTotalRowsSuccess(amount))
        ),
        catchError(error => ctx.dispatch(new TruckActions.ActionFailed(error)))
      );
  }

  @Action(TruckActions.GetTotalRowsSuccess)
  getTotalRowsSuccess(
    ctx: StateContext<TruckStateModel>,
    action: TruckActions.GetTotalRowsSuccess
  ) {
    ctx.patchState({
      total: action.rows
    });
  }

  @Action(TruckActions.UpdateTruck)
  updateTruck(
    ctx: StateContext<TruckStateModel>,
    action: TruckActions.UpdateTruck
  ) {
    return this.service
      .updateTruck(action.truck)
      .pipe(
        map(() =>
          ctx.dispatch(new TruckActions.UpdateTuckSuccess(action.truck))
        ),
        catchError(error => ctx.dispatch(new TruckActions.ActionFailed(error)))
      );
  }

  @Action(TruckActions.UpdateTuckSuccess)
  updateTruckSuccess(
    ctx: StateContext<TruckStateModel>,
    action: TruckActions.UpdateTuckSuccess
  ) {
    const state = ctx.getState();
    ctx.patchState({
      trucks: {
        ...state.trucks,
        [action.truck.id]: action.truck
      }
    });
  }

  @Action(TruckActions.InsertTruck)
  insertTruck(
    ctx: StateContext<TruckStateModel>,
    action: TruckActions.InsertTruck
  ) {
    return this.service
      .insertTruck(action.truck)
      .pipe(
        map(() =>
          ctx.dispatch(new TruckActions.InsertTruckSuccess(action.truck))
        ),
        catchError(error => ctx.dispatch(new TruckActions.ActionFailed(error)))
      );
  }

  @Action(TruckActions.InsertTruckSuccess)
  insertTruckSuccess(
    ctx: StateContext<TruckStateModel>,
    action: TruckActions.InsertTruckSuccess
  ) {
    const state = ctx.getState();
    ctx.patchState({
      trucks: {
        ...state.trucks,
        [action.truck.id]: action.truck
      }
    });
  }

  @Action(TruckActions.DeleteTruck)
  deleteTruck(
    ctx: StateContext<TruckStateModel>,
    action: TruckActions.DeleteTruck
  ) {
    return this.service
      .deleteTruck(action.key)
      .pipe(
        map(() =>
          ctx.dispatch(new TruckActions.DeleteTruckSuccess(action.key))
        ),
        catchError(error => ctx.dispatch(new TruckActions.ActionFailed(error)))
      );
  }

  @Action(TruckActions.DeleteTruckSuccess)
  deleteTruckSuccess(
    ctx: StateContext<TruckStateModel>,
    action: TruckActions.DeleteTruckSuccess
  ) {
    const state = ctx.getState();
    const { [action.key]: deleted, ...newTrucks } = state.trucks;
    ctx.patchState({
      trucks: newTrucks
    });
  }

  @Action(TruckActions.ActionFailed)
  actionFailed(
    ctx: StateContext<TruckStateModel>,
    action: TruckActions.ActionFailed
  ) {
    this.dialogService.openDialog('Error', action.error);
  }
}
