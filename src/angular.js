import {
  ENVIRONMENT_INITIALIZER,
  InjectionToken,
  inject,
  makeEnvironmentProviders
} from "@angular/core";
import {
  ProductTourService,
  createProductTourService
} from "product-tour-js";

export { ProductTourService };

export const PRODUCT_TOUR_OPTIONS = new InjectionToken("PRODUCT_TOUR_OPTIONS");

function createProviders(options, createService) {
  return makeEnvironmentProviders([
    { provide: PRODUCT_TOUR_OPTIONS, useValue: options },
    {
      provide: ProductTourService,
      useFactory: () => createService(inject(PRODUCT_TOUR_OPTIONS))
    },
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        const service = inject(ProductTourService);
        const resolvedOptions = inject(PRODUCT_TOUR_OPTIONS);
        void service.initialize().catch((error) => {
          const onError = resolvedOptions.onError;
          if (onError) onError(error);
          else console.error("[product-tour-js] Could not initialize product tours.", error);
        });
      }
    }
  ]);
}

/**
 * Register one framework-neutral ProductTourService in Angular's root
 * environment injector and initialize it when the application starts.
 */
export function provideProductTour(options = {}) {
  return createProviders(options, createProductTourService);
}

/** @internal Used by optional Angular integrations. */
export function provideProductTourWithFactory(options, factory) {
  return createProviders(options, factory);
}
