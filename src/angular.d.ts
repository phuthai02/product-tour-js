import type { EnvironmentProviders, InjectionToken } from "@angular/core";
import {
  ProductTourService,
  type ProductTourServiceOptions
} from "./index.js";

export { ProductTourService };

export declare const PRODUCT_TOUR_OPTIONS: InjectionToken<ProductTourServiceOptions>;

export declare function provideProductTour(
  options?: ProductTourServiceOptions
): EnvironmentProviders;

export declare function provideProductTourWithFactory(
  options: ProductTourServiceOptions,
  factory: (options: ProductTourServiceOptions) => ProductTourService
): EnvironmentProviders;
