import { LitElement, html, customElement, property, CSSResult, TemplateResult, css, PropertyValues } from 'lit-element';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';

import './editor';

import { NextBusCardConfig } from './types';
import { CARD_VERSION } from './const';

import { localize } from './localize/localize';

/* eslint no-console: 0 */
console.info(
  `%c  NEXTBUS-CARD \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

@customElement('nextbus-card')
export class NextBusCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('nextbus-card-editor') as LovelaceCardEditor;
  }

  public static getStubConfig(): object {
    return {};
  }

  @property() public hass?: HomeAssistant;
  @property() private _config?: NextBusCardConfig;

  public setConfig(config: NextBusCardConfig): void {
    if (!config || !config.entities || config.entities.length === 0) {
      throw new Error(localize('common.invalid_configuration'));
    }

    this._config = {
      name: 'Public Transit',
      ...config,
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has('config')) return true;
    const newEntities = (this._config && this._config.entities) || [];
    if (
      newEntities.find((_entity, idx) => {
        const oldHass = changedProps.get('hass') as HomeAssistant | undefined;
        if (oldHass) {
          return !this.hass || oldHass.states[newEntities[idx]] !== this.hass.states[newEntities[idx]];
        }
        return true;
      })
    )
      return true;
    return false;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <ha-card .header=${this._config.name} tabindex="0" aria-label="Next Bus">
        <div id="states" class="card-content">
          ${this._config.entities.map(entity => {
            if (!entity) return html``;

            const stateObj = this.hass && this.hass.states[entity];

            if (!stateObj) {
              return html`
                <hui-error-entity-row .entity="${entity}"></hui-error-entity-row>
              `;
            }

            const upcoming = stateObj.attributes.upcoming.split(',').map(v => v.trim());
            const icon = /\d+/.test(stateObj.attributes.route.split(' ')[0]) ? 'mdi:bus' : 'mdi:tram';

            const lastUpdateTime = new Date(stateObj.last_updated).getTime();
            const next = upcoming.shift();
            const nextTime = lastUpdateTime + parseInt(next, 10) * 60 * 1000;
            const now = new Date().getTime();
            const timeDelta = Math.abs(nextTime - now);
            const minutes = Math.ceil(timeDelta / (1000 * 60));

            let displayMin = `${minutes} min${minutes > 1 ? 's' : ''}`;
            let color = '';

            if (nextTime < now) {
              color = 'grey !important;';
              displayMin = 'n/a';
            } else if (minutes <= 5) {
              color = 'red !important;';
            } else if (minutes === 0) {
              displayMin = 'now';
            }

            return html`
              <div class="flex">
                <div class="badge">
                  <ha-icon icon="${icon}"></ha-icon>
                </div>
                <div class="info padName">
                  <div class="routeName">
                    <strong>${stateObj.attributes.route}</strong> <small>to ${stateObj.attributes.direction}</small>
                  </div>
                  <div class="routeStop"><ha-icon icon="mdi:map-marker"></ha-icon> ${stateObj.attributes.stop}</div>
                </div>
                <div class="upcoming">
                  <div class="nextTime"><strong><span style="color: ${color}">${displayMin}</strong></span></div>
                  <div class="afterTime">
                    ${upcoming.length > 1 ? upcoming.join(', ').toString() + ' mins' : ''}
                  </div>
                </div>
              </div>
            `;
          })}
        </div>
      </ha-card>
    `;
  }

  getCardSize(): number {
    if (!this._config || !this._config.entities) return 1;
    return this._config.entities.length + 1;
  }

  static get styles(): CSSResult {
    return css`
      .flex {
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-width: 0px;
        flex: 1 1 0%;
      }
      .info {
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        flex: 1 0 60px;
        margin-left: 12px;
      }
      .upcoming {
        margin-left: 12px;
        text-align: right;
      }
      .padName {
        padding: 12px 0px;
      }
      .routeName,
      .nextTime {
        margin-bottom: 4px;
      }
      .routeStop,
      .afterTime {
        font-size: 0.75em;
      }
      .routeStop ha-icon {
        width: 12px;
        height: 12px;
      }
    `;
  }
}
