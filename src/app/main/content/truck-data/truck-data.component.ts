import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ViewChild
} from '@angular/core';
import { Observable } from 'rxjs/Observable';

import DataSource from 'devextreme/data/data_source';
import CustomStore from 'devextreme/data/custom_store';
import { DxDataGridComponent } from 'devextreme-angular/ui/data-grid';

import { Store, Select } from '@ngxs/store';
import { TruckState } from './store/states/truck.state';
import * as TruckActions from './store/actions/truck.actions';

import { MatDialog } from '@angular/material';

import { Truck } from '../../models/truck.model';
import { TruckDataService } from './truck-data.service';
import { TruckDataModalComponent } from './truck-data-modal/truck-data-modal.component';

@Component({
  selector: 'fuse-truck-data',
  templateUrl: './truck-data.component.html',
  styleUrls: ['./truck-data.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TruckDataComponent implements OnInit {
  @ViewChild('truckGrid') public dataGrid: DxDataGridComponent;

  @Select(TruckState.trucksArray) trucks$: Observable<Truck[]>;

  dataSource = {};
  customStore;
  columns: string[];
  dialogRef;

  constructor(
    private service: TruckDataService,
    private store: Store,
    public dialog: MatDialog
  ) {
    const self = this;
    let dispatchSubscription;
    let updateSubscription;
    let insertSubscription;
    let removeSubscription;

    this.customStore = new CustomStore({
      // Order into filter ignores onclick filters
      load(loadOptions: any) {
        console.log(loadOptions);
        // Filter
        let filter: string;
        if (loadOptions.filter) {
          if (loadOptions.filter[0] instanceof Array) {
            filter = '';
            loadOptions.filter.forEach(filterOption => {
              if (filterOption instanceof Array) {
                filter += `${filterOption[0]}+${filterOption[1]}+${
                  filterOption[2]
                },`;
              }
            });
            filter = filter.slice(0, filter.length - 1);
          } else {
            filter = `${loadOptions.filter[0]}+${loadOptions.filter[1]}+${
              loadOptions.filter[2]
            }`;
          }
        } else {
          filter = '';
        }

        // Sorting
        let order: string;
        if (loadOptions.sort) {
          order = loadOptions.sort[0].selector;
          if (loadOptions.sort[0].desc === true) {
            order = loadOptions.sort[0].selector + ' DESC';
          }
        } else {
          order = '';
        }

        return new Promise((res, rej) => {
          self.store.dispatch(new TruckActions.GetTotalRows(filter));
          dispatchSubscription = self.store
            .dispatch(
              new TruckActions.GetData(
                loadOptions.take,
                loadOptions.skip,
                order,
                filter
              )
            )
            .subscribe(result => {
              const truckArray = Object.keys(result.truck.trucks).map(
                id => result.truck.trucks[id]
              );
              if (order) {
                const sortedTruckArray = truckArray.sort(
                  self.dynamicSort(order)
                );
                return res({
                  data: sortedTruckArray,
                  totalCount: result.truck.total
                });
              } else {
                return res({
                  data: truckArray,
                  totalCount: result.truck.total
                });
              }
            });
        });
      },
      update(key, values) {
        return new Promise((res, rej) => {
          updateSubscription = self.store
            .dispatch(new TruckActions.UpdateTruck(values))
            .subscribe(result => {
              return res({
                key: key,
                result: result
              });
            });
        });
      },
      insert(values) {
        return new Promise((res, rej) => {
          insertSubscription = self.store
            .dispatch(new TruckActions.InsertTruck(values))
            .subscribe(result => {
              return res({
                value: values
              });
            });
        });
      },
      remove(key) {
        return new Promise((res, rej) => {
          removeSubscription = self.store
            .dispatch(new TruckActions.DeleteTruck(key.id))
            .subscribe(result => {
              return res();
            });
        });
      },
      onLoaded() {
        dispatchSubscription.unsubscribe();
      },
      onUpdated() {
        updateSubscription.unsubscribe();
        self.dataGrid.instance.refresh();
      },
      onRemoved() {
        removeSubscription.unsubscribe();
      },
      onInserted() {
        insertSubscription.unsubscribe();
        self.dataGrid.instance.refresh();
      }
    });
    this.dataSource = new DataSource(this.customStore);
  }

  ngOnInit() {
    this.columns = ['number', 'brand', 'licencePlate', 'chassis', 'rental'];
  }

  rowClickEvent(data) {
    this.dialogRef = this.dialog.open(TruckDataModalComponent, {
      data: {
        truck: data.data
      }
    });

    this.dialogRef.afterClosed().subscribe(response => {
      if (!response) {
        return;
      }
      this.customStore.update(response.value.id, response.value);
    });
  }

  dynamicSort(property: string) {
    let sortOrder = 1;
    if (property.includes(' DESC')) {
      sortOrder = -1;
      property = property.split(' ')[0];
    }
    return function(a, b) {
      const result =
        a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
      return result * sortOrder;
    };
  }
}
