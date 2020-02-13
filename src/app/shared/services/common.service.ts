import { Injectable, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, of, Observable } from 'rxjs';
import { take, map, takeUntil, catchError } from 'rxjs/operators';

import { DataService } from './data.service';
import { CurrencyUnitEnum, TimeUnitEnum, ScreenSizeEnum } from './consts-enums-functions';
import { environment, API_URL } from '../../../environments/environment';

@Injectable()
export class CommonService implements OnInit {
  currencyUnits = [];
  CurrencyUnitEnum = CurrencyUnitEnum;
  conversionData = { data: null, last_fetched: null };
  private screenSize = ScreenSizeEnum.MD;

  constructor(private dataService: DataService) {}

  ngOnInit() {}

  getScreenSize() {
    return this.screenSize;
  }

  setScreenSize(screenSize: ScreenSizeEnum) {
    this.screenSize = screenSize;
  }

  sortDescByKey(array, key) {
    return array.sort(function (a, b) {
      const x = +a[key];
      const y = +b[key];
      return ((x > y) ? -1 : ((x < y) ? 1 : 0));
    });
  }

  camelCase(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => { 
        return index == 0 ? word.toLowerCase() : word.toUpperCase(); 
    }).replace(/\s+/g, '');
  } 

  titleCase(str) {
    return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
  } 

  convertCurrency(value: number, from: string, otherCurrencyUnit: string, fiatConversion: boolean): Observable<any> {
    let latest_date = new Date().valueOf();
    if(fiatConversion && otherCurrencyUnit) {
      if(this.conversionData.data && this.conversionData.last_fetched && (latest_date < (this.conversionData.last_fetched.valueOf() + 300000))) {
        return of(this.convertWithFiat(value, from, otherCurrencyUnit));
      } else {
        return this.dataService.getFiatRates()
        .pipe(take(1),
        map((data: any) => {
          this.conversionData.data = data ? JSON.parse(data) : {};
          this.conversionData.last_fetched = latest_date;
          return this.convertWithFiat(value, from, otherCurrencyUnit);
        }));
      }
    } else {
      return of(this.convertWithoutFiat(value, from));
    }
  }

  convertWithoutFiat(value: number, from: string) {
    let returnValue = {};
    returnValue[CurrencyUnitEnum.SATS] = 0;
    returnValue[CurrencyUnitEnum.BTC] = 0;
    switch (from) {
      case CurrencyUnitEnum.SATS:
        returnValue[CurrencyUnitEnum.SATS] = value;
        returnValue[CurrencyUnitEnum.BTC] = value * 0.00000001;
        break;
      case CurrencyUnitEnum.BTC:
        returnValue[CurrencyUnitEnum.SATS] = value * 100000000;
        returnValue[CurrencyUnitEnum.BTC] = value;
        break;
      default:
        break;
    }
    return returnValue;
  }

  convertWithFiat(value: number, from: string, otherCurrencyUnit: string) {
    let returnValue = {unit: otherCurrencyUnit, symbol: this.conversionData.data[otherCurrencyUnit].symbol};
    returnValue[CurrencyUnitEnum.SATS] = 0;
    returnValue[CurrencyUnitEnum.BTC] = 0;
    returnValue[CurrencyUnitEnum.OTHER] = 0;
    switch (from) {
      case CurrencyUnitEnum.SATS:
        returnValue[CurrencyUnitEnum.SATS] = value;
        returnValue[CurrencyUnitEnum.BTC] = value * 0.00000001;
        returnValue[CurrencyUnitEnum.OTHER] = value * 0.00000001 * this.conversionData.data[otherCurrencyUnit].last;
        break;
      case CurrencyUnitEnum.BTC:
        returnValue[CurrencyUnitEnum.SATS] = value * 100000000;
        returnValue[CurrencyUnitEnum.BTC] = value;
        returnValue[CurrencyUnitEnum.OTHER] = value * this.conversionData.data[otherCurrencyUnit].last;
        break;
      case (CurrencyUnitEnum.OTHER):
        returnValue[CurrencyUnitEnum.SATS] = value / this.conversionData.data[otherCurrencyUnit].last * 100000000;
        returnValue[CurrencyUnitEnum.BTC] = value / this.conversionData.data[otherCurrencyUnit].last;
        returnValue[CurrencyUnitEnum.OTHER] = value;
        break;
      default:
        break;
    }
    return returnValue;
  }

  convertTime(value: number, from: string, to: string) {
    switch (from) {
      case TimeUnitEnum.SECS:
        switch (to) {
          case TimeUnitEnum.MINS:
            value = value / 60;
            break;
          case TimeUnitEnum.HOURS:
            value = value / 3600;
            break;
          case TimeUnitEnum.DAYS:
            value = value / (3600 * 24);
            break;
          default:
            break;
        }
        break;
      case TimeUnitEnum.MINS:
        switch (to) {
          case TimeUnitEnum.SECS:
            value = value * 60;
            break;
          case TimeUnitEnum.HOURS:
            value = value / 60;
            break;
          case TimeUnitEnum.DAYS:
            value = value / (60 * 24);
            break;
          default:
            break;
        }
        break;
      case TimeUnitEnum.HOURS:
        switch (to) {
          case TimeUnitEnum.SECS:
            value = value * 3600;
            break;
          case TimeUnitEnum.MINS:
            value = value * 60;
            break;
          case TimeUnitEnum.DAYS:
            value = value / 24;
            break;
          default:
            break;
        }
        break;
      case TimeUnitEnum.DAYS:
        switch (to) {
          case TimeUnitEnum.SECS:
            value = value * 3600 * 24;
            break;
          case TimeUnitEnum.MINS:
            value = value * 60 * 24;
            break;
          case TimeUnitEnum.HOURS:
            value = value * 24;
            break;
          default:
            break;
        }
        break;
      default:
        break;
    }
    return value;
  }

  convertTimestampToDate(num: number) {
    return new Date(num * 1000).toUTCString().substring(5, 22).replace(' ', '/').replace(' ', '/').toUpperCase();
  };

}
