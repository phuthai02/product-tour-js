import { inject } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { createProductTourService } from "product-tour-js";
import {
  ProductTourService,
  provideProductTourWithFactory
} from "product-tour-js/angular";

export { ProductTourService };

function firstValue(observable) {
  return new Promise((resolve, reject) => {
    let subscription;
    subscription = observable.subscribe({
      next(value) {
        resolve(value);
        queueMicrotask(() => subscription?.unsubscribe());
      },
      error: reject
    });
  });
}

/**
 * Register ProductTourService and connect strings prefixed with "i18n:" to
 * the application's ngx-translate TranslateService.
 */
export function provideProductTourNgxTranslate(options = {}) {
  return provideProductTourWithFactory(options, (resolvedOptions) => {
    const translateService = inject(TranslateService);
    return createProductTourService({
      ...resolvedOptions,
      translate: resolvedOptions.translate
        ?? ((key) => firstValue(translateService.get(key))),
      onLanguageChange: resolvedOptions.onLanguageChange
        ?? ((reload) => translateService.onLangChange.subscribe(reload))
    });
  });
}
