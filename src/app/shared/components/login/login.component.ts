import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as sha256 from 'sha256';
import { Store } from '@ngrx/store';

import { faUnlockAlt } from '@fortawesome/free-solid-svg-icons';

import { ConfigSettingsNode } from '../../models/RTLconfig';
import { LoggerService } from '../../services/logger.service';
import * as fromRTLReducer from '../../../store/rtl.reducers';
import * as RTLActions from '../../../store/rtl.actions';

@Component({
  selector: 'rtl-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  public faUnlockAlt = faUnlockAlt;
  public selNode: ConfigSettingsNode;
  public password = '';
  public rtlSSO = 0;
  public rtlCookiePath = '';
  public accessKey = '';

  private unsub: Array<Subject<void>> = [new Subject(), new Subject(), new Subject()];

  constructor(private logger: LoggerService, private store: Store<fromRTLReducer.RTLState>) { }

  ngOnInit() {
    this.store.select('root')
    .pipe(takeUntil(this.unsub[0]))
    .subscribe((rtlStore) => {
      rtlStore.effectErrorsRoot.forEach(effectsErr => {
        this.logger.error(effectsErr);
      });
      this.selNode = rtlStore.selNode;
      this.logger.info(rtlStore);
    });
  }

  onLogin() {
    if(!this.password) { return true; }
    this.store.dispatch(new RTLActions.Login({password: sha256(this.password), initialPass: this.password === 'password'}));
  }

  resetData() {
    this.password = '';
  }

  ngOnDestroy() {
    this.unsub.forEach(completeSub => {
      completeSub.next();
      completeSub.complete();
    });
  }

}
