import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Subject, of } from 'rxjs';
import { map, mergeMap, catchError, withLatestFrom } from 'rxjs/operators';

import { environment, API_URL } from '../../../environments/environment';
import { LoggerService } from '../../shared/services/logger.service';
import { GetInfoCL, FeesCL, BalanceCL, LocalRemoteBalanceCL, PaymentCL, FeeRatesCL } from '../../shared/models/clModels';

import * as fromRTLReducer from '../../store/rtl.reducers';
import * as RTLActions from '../../store/rtl.actions';

@Injectable()
export class CLEffects implements OnDestroy {
  CHILD_API_URL = API_URL + '/cl';
  private unSubs: Array<Subject<void>> = [new Subject(), new Subject()];

  constructor(
    private actions$: Actions,
    private httpClient: HttpClient,
    private store: Store<fromRTLReducer.RTLState>,
    private logger: LoggerService) { }

  @Effect()
  infoFetchCL = this.actions$.pipe(
    ofType(RTLActions.FETCH_INFO_CL),
    withLatestFrom(this.store.select('root')),
    mergeMap(([action, store]) => {
      this.store.dispatch(new RTLActions.ClearEffectErrorCl('FetchInfoCL'));
      return this.httpClient.get<GetInfoCL>(this.CHILD_API_URL + environment.GETINFO_API)
        .pipe(
          map((info) => {
            this.logger.info(info);
            let chainObj = { chain: '', network: '' };
            if (info.network === 'testnet') {
              chainObj.chain = 'Bitcoin';
              chainObj.network = 'Testnet';
            } else if (info.network === 'bitcoin') {
              chainObj.chain = 'Bitcoin';
              chainObj.network = 'Mainnet';
            } else if (info.network === 'litecoin') {
              chainObj.chain = 'Litecoin';
              chainObj.network = 'Mainnet';
            } else if (info.network === 'litecoin-testnet') {
              chainObj.chain = 'Litecoin';
              chainObj.network = 'Testnet';
            }
            sessionStorage.setItem('clUnlocked', 'true');
            const node_data = {
              identity_pubkey: info.id,
              alias: info.alias,
              testnet: (info.network === 'testnet' || info.network === 'litecoin-testnet') ? true : false,
              chains: [chainObj],
              version: info.version,
              currency_unit: 'BTC',
              smaller_currency_unit: 'Sats',
              numberOfPendingChannels: info.num_pending_channels
            };
            this.store.dispatch(new RTLActions.SetNodeData(node_data));
            return {
              type: RTLActions.SET_INFO_CL,
              payload: (undefined !== info) ? info : {}
            };
          }),
          catchError((err) => {
            return this.handleErrorWithAlert('ERROR', 'Get Info Failed', this.CHILD_API_URL + environment.GETINFO_API, err);
          })
        );
    }
    ));

  @Effect()
  fetchFeesCL = this.actions$.pipe(
    ofType(RTLActions.FETCH_FEES_CL),
    mergeMap((action: RTLActions.FetchFeesCL) => {
      this.store.dispatch(new RTLActions.ClearEffectErrorCl('FetchFeesCL'));
      return this.httpClient.get<FeesCL>(this.CHILD_API_URL + environment.FEES_API);
    }),
    map((fees) => {
      this.logger.info(fees);
      return {
        type: RTLActions.SET_FEES_CL,
        payload: (undefined !== fees) ? fees : {}
      };
    }),
    catchError((err: any) => {
      return this.handleErrorWithoutAlert('FetchFeesCL', err);
    }
  ));

  @Effect()
  fetchFeeRatesCL = this.actions$.pipe(
    ofType(RTLActions.FETCH_FEE_RATES_CL),
    mergeMap((action: RTLActions.FetchFeeRatesCL) => {
      this.store.dispatch(new RTLActions.ClearEffectErrorCl('FetchFeeRatesCL'));
      return this.httpClient.get<FeeRatesCL>(this.CHILD_API_URL + environment.NETWORK_API + '/feeRates/' + action.payload);
    }),
    map((feeRates) => {
      this.logger.info(feeRates);
      return {
        type: RTLActions.SET_FEE_RATES_CL,
        payload: (undefined !== feeRates) ? feeRates : {}
      };
    }),
    catchError((err: any) => {
      return this.handleErrorWithoutAlert('FetchFeeRatesCL', err);
    }
  ));

  @Effect()
  fetchBalanceCL = this.actions$.pipe(
    ofType(RTLActions.FETCH_BALANCE_CL),
    mergeMap((action: RTLActions.FetchBalanceCL) => {
      this.store.dispatch(new RTLActions.ClearEffectErrorCl('FetchBalanceCL'));
      return this.httpClient.get<BalanceCL>(this.CHILD_API_URL + environment.BALANCE_API);
    }),
    map((balance) => {
      this.logger.info(balance);
      return {
        type: RTLActions.SET_BALANCE_CL,
        payload: (undefined !== balance) ? balance : {}
      };
    }),
    catchError((err: any) => {
      return this.handleErrorWithoutAlert('FetchBalanceCL', err);
    }
  ));

  @Effect()
  fetchLocalRemoteBalanceCL = this.actions$.pipe(
    ofType(RTLActions.FETCH_LOCAL_REMOTE_BALANCE_CL),
    mergeMap((action: RTLActions.FetchLocalRemoteBalanceCL) => {
      this.store.dispatch(new RTLActions.ClearEffectErrorCl('FetchLocalRemoteBalanceCL'));
      return this.httpClient.get<LocalRemoteBalanceCL>(this.CHILD_API_URL + environment.CHANNELS_API + '/localremotebalance');
    }),
    map((lrBalance) => {
      this.logger.info(lrBalance);
      return {
        type: RTLActions.SET_LOCAL_REMOTE_BALANCE_CL,
        payload: (undefined !== lrBalance) ? lrBalance : {}
      };
    }),
    catchError((err: any) => {
      return this.handleErrorWithoutAlert('FetchLocalRemoteBalanceCL', err);
    }
  ));

  @Effect()
  getNewAddressCL = this.actions$.pipe(
    ofType(RTLActions.GET_NEW_ADDRESS_CL),
    mergeMap((action: RTLActions.GetNewAddressCL) => {
      return this.httpClient.get(this.CHILD_API_URL + environment.ON_CHAIN_API + '?type=' + action.payload.addressId)
        .pipe(map((newAddress: any) => {
          this.logger.info(newAddress);
          this.store.dispatch(new RTLActions.CloseSpinner());
          return {
            type: RTLActions.SET_NEW_ADDRESS_CL,
            payload: (undefined !== newAddress && undefined !== newAddress.address) ? newAddress.address : {}
          };
        }),
        catchError((err: any) => {
            return this.handleErrorWithAlert('ERROR', 'Generate New Address Failed', this.CHILD_API_URL + environment.ON_CHAIN_API + '?type=' + action.payload.addressId, err);
        }));
    })
  );

  @Effect({ dispatch: false })
  setNewAddressCL = this.actions$.pipe(
    ofType(RTLActions.SET_NEW_ADDRESS_CL),
    map((action: RTLActions.SetNewAddressCL) => {
      this.logger.info(action.payload);
      return action.payload;
    })
  );

  @Effect()
  peersFetchCL = this.actions$.pipe(
    ofType(RTLActions.FETCH_PEERS_CL),
    mergeMap((action: RTLActions.FetchPeersCL) => {
      this.store.dispatch(new RTLActions.ClearEffectErrorCl('FetchPeersCL'));
      return this.httpClient.get(this.CHILD_API_URL + environment.PEERS_API)
        .pipe(
          map((peers: any) => {
            this.logger.info(peers);
            return {
              type: RTLActions.SET_PEERS_CL,
              payload: (undefined !== peers) ? peers : []
            };
          }),
          catchError((err: any) => {
            return this.handleErrorWithoutAlert('FetchPeersCL', err);
          })
        );
    }
    ));

  @Effect()
  saveNewPeerCL = this.actions$.pipe(
    ofType(RTLActions.SAVE_NEW_PEER_CL),
    mergeMap((action: RTLActions.SaveNewPeerCL) => {
      return this.httpClient.post(this.CHILD_API_URL + environment.PEERS_API, { id: action.payload.id })
        .pipe(
          map((postRes: any) => {
            this.logger.info(postRes);
            this.store.dispatch(new RTLActions.CloseSpinner());
            this.store.dispatch(new RTLActions.OpenAlert({ width: '70%', data: { type: 'SUCCESS', titleMessage: 'Peer Added Successfully!' } }));
            return {
              type: RTLActions.SET_PEERS_CL,
              payload: (undefined !== postRes && postRes.length > 0) ? postRes : []
            };
          }),
          catchError((err: any) => {
            return this.handleErrorWithAlert('ERROR', 'Add Peer Failed', this.CHILD_API_URL + environment.PEERS_API, err);
          })
        );
      }
  ));

  @Effect()
  detachPeerCL = this.actions$.pipe(
    ofType(RTLActions.DETACH_PEER_CL),
    mergeMap((action: RTLActions.DetachPeerCL) => {
      return this.httpClient.delete(this.CHILD_API_URL + environment.PEERS_API + '/' + action.payload.id + '?force=' + action.payload.force)
        .pipe(
          map((postRes: any) => {
            this.logger.info(postRes);
            this.store.dispatch(new RTLActions.CloseSpinner());
            this.store.dispatch(new RTLActions.OpenAlert({ width: '70%', data: { type: 'SUCCESS', titleMessage: 'Peer Detached Successfully!' } }));
            return {
              type: RTLActions.REMOVE_PEER_CL,
              payload: { id: action.payload.id }
            };
          }),
          catchError((err: any) => {
            return this.handleErrorWithAlert('ERROR', 'Unable to Detach Peer. Try again later.', this.CHILD_API_URL + environment.PEERS_API + '/' + action.payload.id, err);
          })
        );
    }
  ));

  @Effect()
  channelsFetchCL = this.actions$.pipe(
    ofType(RTLActions.FETCH_CHANNELS_CL),
    mergeMap((action: RTLActions.FetchChannelsCL) => {
      this.store.dispatch(new RTLActions.ClearEffectErrorCl('FetchChannelsCL'));
      return this.httpClient.get(this.CHILD_API_URL + environment.CHANNELS_API + '/listChannels')
        .pipe(
          map((channels: any) => {
            this.logger.info(channels);
              return {
                type: RTLActions.SET_CHANNELS_CL,
                payload: (undefined !== channels && channels.length > 0) ? channels : []
              };
          },
            catchError((err: any) => {
              return this.handleErrorWithoutAlert('FetchChannelsCL', err);
            })
          ));
    }
    ));

  @Effect()
  openNewChannelCL = this.actions$.pipe(
    ofType(RTLActions.SAVE_NEW_CHANNEL_CL),
    mergeMap((action: RTLActions.SaveNewChannelCL) => {
      return this.httpClient.post(this.CHILD_API_URL + environment.CHANNELS_API, {
        channelId: action.payload.channelId, satoshis: action.payload.satoshis, feeRate: action.payload.feeRate, private: action.payload.private, minconf: (action.payload.minconf) ? action.payload.minconf : ''
      })
        .pipe(
          map((postRes: any) => {
            this.logger.info(postRes);
            this.store.dispatch(new RTLActions.CloseSpinner());
            return {
              type: RTLActions.FETCH_CHANNELS_CL
            };
          }),
          catchError((err: any) => {
            return this.handleErrorWithAlert('ERROR', 'Open Channel Failed', this.CHILD_API_URL + environment.CHANNELS_API, err);            
          })
        );
    }
    ));

  @Effect()
  updateChannelCL = this.actions$.pipe(
    ofType(RTLActions.UPDATE_CHANNELS_CL),
    mergeMap((action: RTLActions.UpdateChannelsCL) => {
      return this.httpClient.post(this.CHILD_API_URL + environment.CHANNELS_API + '/setChannelFee',
        { id: action.payload.channelId, base: action.payload.baseFeeMsat, ppm: action.payload.feeRate })
        .pipe(
          map((postRes: any) => {
            this.logger.info(postRes);
            this.store.dispatch(new RTLActions.CloseSpinner());
            this.store.dispatch(new RTLActions.OpenAlert({ width: '70%', data: { type: 'SUCCESS', titleMessage: 'Channel Updated Successfully!' } }));
            return {
              type: RTLActions.FETCH_CHANNELS_CL
            };
          }),
          catchError((err: any) => {
            return this.handleErrorWithAlert('ERROR', 'Update Channel Failed', this.CHILD_API_URL + environment.CHANNELS_API, err);
          })
        );
    }
    ));

  @Effect()
  closeChannelCL = this.actions$.pipe(
    ofType(RTLActions.CLOSE_CHANNEL_CL),
    mergeMap((action: RTLActions.CloseChannelCL) => {
      const queryParam = action.payload.timeoutSec ? '?unilateralTimeout =' + action.payload.timeoutSec : '';
      return this.httpClient.delete(this.CHILD_API_URL + environment.CHANNELS_API + '/' + action.payload.channelId + queryParam)
        .pipe(
          map((postRes: any) => {
            this.logger.info(postRes);
            this.store.dispatch(new RTLActions.CloseSpinner());
            this.store.dispatch(new RTLActions.FetchChannelsCL());
            return {
              type: RTLActions.REMOVE_CHANNEL_CL,
              payload: { channelId: action.payload.channelId }
            };
          }),
          catchError((err: any) => {
            return this.handleErrorWithAlert('ERROR', 'Unable to Close Channel. Try again later.', this.CHILD_API_URL + environment.CHANNELS_API, err);
          })
        );
    }
    ));

  @Effect()
  paymentsFetchCL = this.actions$.pipe(
    ofType(RTLActions.FETCH_PAYMENTS_CL),
    mergeMap((action: RTLActions.FetchPaymentsCL) => {
      this.store.dispatch(new RTLActions.ClearEffectErrorCl('FetchPaymentsCL'));
      return this.httpClient.get<PaymentCL[]>(this.CHILD_API_URL + environment.PAYMENTS_API);
    }),
    map((payments) => {
      this.logger.info(payments);
      return {
        type: RTLActions.SET_PAYMENTS_CL,
        payload: (undefined !== payments && null != payments) ? payments : []
      };
    }),
    catchError((err: any) => {
      return this.handleErrorWithoutAlert('FetchPaymentsCL', err);
    }
  ));

  @Effect()
  decodePaymentCL = this.actions$.pipe(
    ofType(RTLActions.DECODE_PAYMENT_CL),
    mergeMap((action: RTLActions.DecodePaymentCL) => {
      return this.httpClient.get(this.CHILD_API_URL + environment.PAYMENTS_API + '/' + action.payload)
        .pipe(
          map((decodedPayment) => {
            this.logger.info(decodedPayment);
            this.store.dispatch(new RTLActions.CloseSpinner());
            return {
              type: RTLActions.SET_DECODED_PAYMENT_CL,
              payload: (undefined !== decodedPayment) ? decodedPayment : {}
            };
          }),
          catchError((err: any) => {
            return this.handleErrorWithAlert('ERROR', 'Decode Payment Failed', this.CHILD_API_URL + environment.PAYMENTS_API + '/' + action.payload, err);            
          })
        );
    })
  );

  @Effect({ dispatch: false })
  setDecodedPaymentCL = this.actions$.pipe(
    ofType(RTLActions.SET_DECODED_PAYMENT_CL),
    map((action: RTLActions.SetDecodedPaymentCL) => {
      this.logger.info(action.payload);
      return action.payload;
    })
  );

  @Effect()
  sendPaymentCL = this.actions$.pipe(
    ofType(RTLActions.SEND_PAYMENT_CL),
    withLatestFrom(this.store.select('root')),
    mergeMap(([action, store]: [RTLActions.SendPaymentCL, any]) => {
      let queryHeaders = {};
      if (action.payload[2]) {
        queryHeaders = { paymentDecoded: action.payload[1] };
      } else {
        queryHeaders = { paymentReq: action.payload[0] };
      }
      return this.httpClient.post(this.CHILD_API_URL + environment.PAYMENTS_API, queryHeaders)
        .pipe(
          map((sendRes: any) => {
            this.logger.info(sendRes);
            if (sendRes.payment_error) {
              return this.handleErrorWithAlert('ERROR', 'Send Payment Failed', this.CHILD_API_URL + environment.PAYMENTS_API, { status: sendRes.payment_error.status, error: sendRes.payment_error.error.message });
            } else {
              const confirmationMsg = { 'Destination': action.payload[1].destination, 'Timestamp': action.payload[1].timestamp_str, 'Expiry': action.payload[1].expiry };
              confirmationMsg['Amount (' + ((undefined === store.information.smaller_currency_unit) ?
                'Sats' : store.information.smaller_currency_unit) + ')'] = action.payload[1].num_satoshis;
              const msg = {};
              msg['Total Fee (' + ((undefined === store.information.smaller_currency_unit) ? 'Sats' : store.information.smaller_currency_unit) + ')'] =
                (sendRes.payment_route.total_fees_msat / 1000);
              Object.assign(msg, confirmationMsg);
              this.store.dispatch(new RTLActions.OpenAlert({
                width: '70%',
                data: { type: 'SUCCESS', titleMessage: 'Payment Sent Successfully!', message: JSON.stringify(msg) }
              }));
              // this.store.dispatch(new RTLActions.FetchChannelsCL({ routeParam: 'all' }));
              this.store.dispatch(new RTLActions.FetchBalanceCL());
              this.store.dispatch(new RTLActions.FetchPaymentsCL());
              return {
                type: RTLActions.SET_DECODED_PAYMENT_CL,
                payload: {}
              };
            }
          }),
          catchError((err: any) => {
            return this.handleErrorWithAlert('ERROR', 'Send Payment Failed', this.CHILD_API_URL + environment.PAYMENTS_API, err);
          })
        );
    })
  );

  @Effect()
  queryRoutesFetchCL = this.actions$.pipe(
    ofType(RTLActions.GET_QUERY_ROUTES_CL),
    mergeMap((action: RTLActions.GetQueryRoutesCL) => {
      return this.httpClient.get(this.CHILD_API_URL + environment.NETWORK_API + '/getRoute/' + action.payload.destPubkey + '/' + action.payload.amount)
        .pipe(
          map((qrRes: any) => {
            this.logger.info(qrRes);
            return {
              type: RTLActions.SET_QUERY_ROUTES_CL,
              payload: qrRes
            };
          }),
          catchError((err: any) => {
            this.store.dispatch(new RTLActions.SetQueryRoutesCL({routes: []}));
            return this.handleErrorWithAlert('ERROR', 'Get Query Routes Failed', this.CHILD_API_URL + environment.NETWORK_API + '/getRoute/' + action.payload.destPubkey + '/' + action.payload.amount, err);            
          })
        );
    }
    ));

  @Effect({ dispatch: false })
  setQueryRoutesCL = this.actions$.pipe(
    ofType(RTLActions.SET_QUERY_ROUTES_CL),
    map((action: RTLActions.SetQueryRoutesCL) => {
      return action.payload;
    })
  );

  @Effect()
  peerLookupCL = this.actions$.pipe(
    ofType(RTLActions.PEER_LOOKUP_CL),
    mergeMap((action: RTLActions.PeerLookupCL) => {
      this.store.dispatch(new RTLActions.ClearEffectErrorCl('LookupCL'));
      return this.httpClient.get(this.CHILD_API_URL + environment.NETWORK_API + '/listNode/' + action.payload)
        .pipe(
          map((resPeer) => {
            this.logger.info(resPeer);
            this.store.dispatch(new RTLActions.CloseSpinner());
            return {
              type: RTLActions.SET_LOOKUP_CL,
              payload: resPeer
            };
          }),
          catchError((err: any) => {
            this.store.dispatch(new RTLActions.EffectErrorCl({ action: 'LookupCL', code: err.status, message: err.error.message }));
            return this.handleErrorWithAlert('ERROR', 'Peer Lookup Failed', this.CHILD_API_URL + environment.NETWORK_API + '/listNode/' + action.payload, err);
          })
        );
    })
  );

  @Effect()
  channelLookupCL = this.actions$.pipe(
    ofType(RTLActions.CHANNEL_LOOKUP_CL),
    mergeMap((action: RTLActions.ChannelLookupCL) => {
      this.store.dispatch(new RTLActions.ClearEffectErrorCl('LookupCL'));
      return this.httpClient.get(this.CHILD_API_URL + environment.NETWORK_API + '/listChannel/' + action.payload)
        .pipe(
          map((resChannel) => {
            this.logger.info(resChannel);
            this.store.dispatch(new RTLActions.CloseSpinner());
            return {
              type: RTLActions.SET_LOOKUP_CL,
              payload: resChannel
            };
          }),
          catchError((err: any) => {
            this.store.dispatch(new RTLActions.EffectErrorCl({ action: 'LookupCL', code: err.status, message: err.error.message }));
            return this.handleErrorWithAlert('ERROR', 'Channel Lookup Failed', this.CHILD_API_URL + environment.NETWORK_API + '/listChannel/' + action.payload, err);
          })
        );
    })
  );

  @Effect()
  invoiceLookupCL = this.actions$.pipe(
    ofType(RTLActions.INVOICE_LOOKUP_CL),
    mergeMap((action: RTLActions.InvoiceLookupCL) => {
      this.store.dispatch(new RTLActions.ClearEffectErrorCl('LookupCL'));
      return this.httpClient.get(this.CHILD_API_URL + environment.INVOICES_API + '/listInvoice?label=' + action.payload)
        .pipe(
          map((resInvoice) => {
            this.logger.info(resInvoice);
            this.store.dispatch(new RTLActions.CloseSpinner());
            return {
              type: RTLActions.SET_LOOKUP_CL,
              payload: resInvoice
            };
          }),
          catchError((err: any) => {
            this.store.dispatch(new RTLActions.EffectErrorCl({ action: 'LookupCL', code: err.status, message: err.error.message }));
            return this.handleErrorWithAlert('ERROR', 'Invoice Lookup Failed', this.CHILD_API_URL + environment.NETWORK_API + '/listInvoice?label=' + action.payload, err);
          })
        );
    })
  );

  @Effect({ dispatch: false })
  setLookupCL = this.actions$.pipe(
    ofType(RTLActions.SET_LOOKUP_CL),
    map((action: RTLActions.SetLookupCL) => {
      this.logger.info(action.payload);
      return action.payload;
    })
  );

  handleErrorWithoutAlert(actionName: string, err: {status: number, error: any}) {
    this.logger.error(err);
    if(err.status === 401) {
      this.logger.info('Redirecting to Signin');
      return of({ type: RTLActions.SIGNOUT });  
    } else {
      this.store.dispatch(new RTLActions.EffectErrorCl({ action: actionName, code: err.status.toString(), message: err.error.error }));
      this.logger.error(err);
      return of({type:RTLActions.VOID});
    }
  }

  handleErrorWithAlert(alerType: string, alertTitle: string, errURL: string, err: {status: number, error: any}) {
    this.logger.error(err);
    if(err.status === 401) {
      this.logger.info('Redirecting to Signin');
      return of({ type: RTLActions.SIGNOUT });  
    } else {
      this.store.dispatch(new RTLActions.CloseSpinner());
      this.logger.error(err);
      return of(
        {
          type: RTLActions.OPEN_ALERT,
          payload: {
            width: '70%', data: {
              type: alerType, titleMessage: alertTitle,
              message: JSON.stringify({ code: err.status, Message: err.error.error, URL: errURL })
            }
          }
        }
      );
    }
  }

  ngOnDestroy() { 
    this.unSubs.forEach(completeSub => {
      completeSub.next();
      completeSub.complete();
    });    
  }

}
