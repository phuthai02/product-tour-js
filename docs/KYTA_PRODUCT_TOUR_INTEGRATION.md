# Hướng dẫn tích hợp Product Tour cho các module Kyta

Tài liệu này chuẩn hóa cách tích hợp `product-tour-js` cho các module frontend Angular/JHipster trong hệ thống Kyta.

Quy ước tích hợp chung:

- package: `product-tour-js@^0.4.5`;
- đăng ký toàn ứng dụng trong `src/main/webapp/bootstrap.ts`;
- manifest chính: `src/main/webapp/content/product-tours/product-tour.json`;
- tour riêng của từng page: `src/main/webapp/content/product-tours/pages/<page-id>.json`;
- nội dung đa ngôn ngữ đặt trong `src/main/webapp/i18n/<lang>/<module>.json`;
- component gọi lại tour bằng `ProductTourService.startPage(pageId)`.

> Các đoạn có comment dùng cú pháp `jsonc` để giải thích. File chạy thực tế phải là JSON hợp lệ, vì JSON không hỗ trợ `// comment`. Hãy xóa comment trước khi lưu thành `.json`. Không thêm các field kiểu `_comment` vì schema của thư viện không cho phép field ngoài danh sách hỗ trợ.

## 1. Kiến trúc áp dụng chung cho Kyta

Mỗi module Kyta nên dùng một manifest chính để chứa cấu hình dùng chung và một file riêng cho mỗi page.

```text
src/main/webapp/
├─ bootstrap.ts
├─ content/
│  └─ product-tours/
│     ├─ product-tour.json          # Cấu hình chung và danh sách file page
│     └─ pages/
│        ├─ dashboard.json          # Tour của page dashboard
│        ├─ feature-list.json       # Tour của page danh sách
│        └─ feature-detail.json     # Tour của page chi tiết
├─ app/
│  └─ features/
│     └─ <feature>/
│        ├─ <feature>.component.ts
│        └─ <feature>.component.html
└─ i18n/
   ├─ vi/<module>.json
   └─ en/<module>.json
```

Luồng tải cấu hình:

```text
bootstrap.ts
  -> tải content/product-tours/product-tour.json

content/product-tours/product-tour.json
  -> include content/product-tours/pages/dashboard.json
  -> include content/product-tours/pages/feature-list.json
  -> include content/product-tours/pages/feature-detail.json
```

Đường dẫn trong `include` được tính tương đối từ file đang chứa `include`.

## 2. Cài đặt

Chạy tại thư mục frontend của module:

```bash
npm install product-tour-js@^0.4.5
```

Tất cả module Kyta đều sử dụng `ngx-translate`, vì vậy Product Tour luôn được tích hợp qua adapter `product-tour-js/angular/ngx-translate`. `@angular/core` và `@ngx-translate/core` đã có sẵn trong cấu trúc chuẩn của các module Kyta.

Kiểm tra `package.json`:

```jsonc
{
  "dependencies": {
    // Thư viện Product Tour. Dùng cùng major/minor giữa các module Kyta.
    "product-tour-js": "^0.4.5"
  }
}
```

Để các module chạy đúng cùng một phiên bản, nên commit file lock tương ứng của project (`package-lock.json`, `yarn.lock` hoặc `pnpm-lock.yaml`).

## 3. Đảm bảo thư mục cấu hình được build thành static asset

Trong `angular.json`, `src/main/webapp/content` phải nằm trong `build.options.assets`:

```jsonc
{
  "projects": {
    "<project-name>": {
      "architect": {
        "build": {
          "options": {
            "assets": [
              // Copy toàn bộ content, bao gồm product-tours, sang output static.
              "src/main/webapp/content",
              "src/main/webapp/favicon.ico",
              "src/main/webapp/manifest.webapp",
              "src/main/webapp/robots.txt"
            ]
          }
        }
      }
    }
  }
}
```

Sau khi build, phải truy cập được manifest qua URL của module, ví dụ:

```text
https://<host>/<module-base-href>/content/product-tours/product-tour.json
```

Không thể truyền đường dẫn file trên máy như `C:\...\product-tour.json` cho browser. File phải được web server phục vụ qua URL. Nếu đặt file ở domain khác, server đó phải cho phép CORS.

## 4. Đăng ký Product Tour một lần trong `bootstrap.ts`

Mọi module Kyta đăng ký adapter `ngx-translate` một lần trong `bootstrap.ts`. Provider chỉ cần khai báo đường dẫn `source`; các cấu hình về hành vi, giao diện và nội dung được quản lý tập trung trong `product-tour.json`:

```ts
import { provideProductTourNgxTranslate } from 'product-tour-js/angular/ngx-translate';

bootstrapApplication(MainComponent, {
  providers: [
    provideProductTourNgxTranslate({
      // URL tương đối với base href của module.
      // Ví dụ baseHref=/<module>/ sẽ tải /<module>/content/product-tours/product-tour.json.
      source: 'content/product-tours/product-tour.json',
    }),
  ],
});
```

Với Kyta triển khai nhiều module dưới các `baseHref` khác nhau, dùng URL tương đối `content/...`. Không thêm `/` ở đầu đường dẫn. Theo quy ước Kyta, object truyền vào provider chỉ có duy nhất field `source`; mọi cấu hình được manifest hỗ trợ phải đặt trong JSON để các module có cùng một cách quản lý.

## 5. Manifest chính `product-tour.json`

Tạo file:

```text
src/main/webapp/content/product-tours/product-tour.json
```

Template có chú thích cho từng cấu hình:

```jsonc
{
  // ID ổn định và duy nhất của Product Tour trong module.
  "id": "<module-name>-product-tour",

  // Phiên bản nội dung. Tăng giá trị khi muốn người đã hoàn tất được xem tour mới.
  "version": 1,

  // Tự chạy tour khớp với route hiện tại sau khi manager khởi tạo.
  "autoStart": true,

  // Chỉ tự hiển thị một lần cho mỗi manifest/page/version.
  "showOnce": true,

  // Khi người dùng đóng/bỏ qua, vẫn đánh dấu tour là đã xem.
  "markOnDismiss": true,

  // Nơi lưu trạng thái hoàn tất: local, session hoặc none.
  "storage": "local",

  // Prefix của key được lưu trong Web Storage.
  "storageKey": "kyta-product-tour",

  // Thời gian chờ trước khi bắt đầu tour, đơn vị millisecond.
  "startDelay": 500,

  // Thời gian tối đa chờ target xuất hiện trong DOM, đơn vị millisecond.
  "targetTimeout": 3000,

  // Cách cuộn đến target: auto hoặc smooth.
  "scrollBehavior": "auto",

  // Khi không tìm thấy target: skip bỏ qua step, abort dừng toàn bộ tour.
  "onMissingTarget": "skip",

  // Theo dõi history, hash và route để tự chọn page tour phù hợp.
  "watchRoutes": true,

  // Cho phép nhấn Escape để đóng tour.
  "closeOnEscape": true,

  // Cho phép click vùng overlay để đóng tour.
  "closeOnOverlayClick": false,

  // Hiện nút đóng (x) trên popover. Page/step có thể override.
  "showCloseButton": false,

  // Cho phép tương tác với phần tử đang được highlight. Page/step có thể override.
  "allowInteraction": false,

  // Cho phép render content dạng HTML. Nên để false nếu nội dung không hoàn toàn tin cậy.
  "allowHtml": false,

  // Nhãn nút dùng key ngx-translate nhờ prefix i18n:.
  "labels": {
    // Nút đi tới step tiếp theo.
    "next": "i18n:<module>.tour.labels.next",
    // Nút quay lại step trước.
    "previous": "i18n:<module>.tour.labels.previous",
    // Nút hoàn tất ở step cuối.
    "finish": "i18n:<module>.tour.labels.finish",
    // Nút bỏ qua tour.
    "skip": "i18n:<module>.tour.labels.skip",
    // Accessible label cho nút đóng.
    "close": "i18n:<module>.tour.labels.close",
    // Mẫu hiển thị tiến độ; dùng {current} và {total}.
    "progress": "i18n:<module>.tour.labels.progress",
    // Thông báo dùng khi field bắt buộc chưa được nhập.
    "required": "i18n:<module>.tour.labels.required"
  },

  // Giao diện dùng chung cho mọi page trong manifest.
  "theme": {
    // Màu nhấn của nút, progress và spotlight.
    "accentColor": "var(--primary-primary, #a519d9)",
    // Màu overlay. Có thể dùng rgba để điều chỉnh độ trong suốt.
    "overlayColor": "rgba(15, 23, 42, 0.58)",
    // Bo góc của popover.
    "borderRadius": "12px",
    // z-index; phải cao hơn dialog/header của ứng dụng.
    "zIndex": 12000
  },

  // Cách hiển thị tiến độ.
  "progress": {
    // none, text, dots hoặc bar.
    "type": "dots",
    // top-left, top-center, top-right, bottom-left, bottom-center hoặc bottom-right.
    "position": "top-center"
  },

  // Danh sách file page; đường dẫn tương đối từ product-tour.json.
  "include": [
    "./pages/dashboard.json",
    "./pages/feature-list.json"
  ]
}
```

Quy ước cho Kyta:

- `id` manifest: `<module-name>-product-tour`;
- `storageKey`: dùng chung `kyta-product-tour` hoặc thêm tên module nếu cần tách biệt hoàn toàn;
- tăng `version` khi nội dung hoặc thứ tự step thay đổi đáng kể;
- dùng `onMissingTarget: "skip"` cho dashboard có nhiều khối render có điều kiện;
- không đặt token, secret hoặc dữ liệu nhạy cảm trong JSON vì đây là static asset công khai với người dùng đã truy cập module.

## 6. File riêng cho từng page

Mỗi page tạo một file tại:

```text
src/main/webapp/content/product-tours/pages/<page-id>.json
```

Ví dụ `pages/dashboard.json`:

```jsonc
{
  // ID page, phải duy nhất trong toàn bộ manifest.
  // Giá trị này cũng được truyền vào startPage('dashboard').
  "id": "dashboard",

  // Điều kiện route để manager tự nhận diện page hiện tại.
  "match": {
    // Glob phù hợp với module có base path, ví dụ /<module>/dashboard.
    "path": "*/dashboard",
    // exact: khớp tuyệt đối; prefix: khớp phần đầu; glob: hỗ trợ wildcard *.
    "mode": "glob"
  },

  // Cho phép bật/tắt riêng tour của page mà không xóa file.
  "enabled": true,

  // Danh sách step theo đúng thứ tự hiển thị.
  "steps": [
    {
      // ID step, duy nhất trong page; dùng cho goTo và rẽ nhánh.
      "id": "welcome",
      // modal không cần target, phù hợp cho lời chào hoặc giới thiệu chung.
      "type": "modal",
      // Key dịch tiêu đề.
      "title": "i18n:<module>.tour.dashboard.steps.welcome.title",
      // Key dịch nội dung.
      "content": "i18n:<module>.tour.dashboard.steps.welcome.content"
    },
    {
      // ID ổn định của step tooltip.
      "id": "filter",
      // tooltip bắt buộc phải có target.
      "type": "tooltip",
      // CSS selector được truyền vào document.querySelector().
      "target": "[data-tour=\"dashboard-filter\"]",
      // auto, top, right, bottom, left hoặc center.
      "placement": "bottom",
      // Cho phép thao tác riêng với target ở step này.
      "allowInteraction": true,
      // Nếu true, click target sẽ tự chuyển sang step kế tiếp.
      "nextOnTargetClick": false,
      // Khoảng trống quanh spotlight, tính bằng pixel.
      "padding": 8,
      // Có thể override cấu hình nút đóng của manifest.
      "showCloseButton": false,
      // Key dịch tiêu đề của step.
      "title": "i18n:<module>.tour.dashboard.steps.filter.title",
      // Key dịch nội dung của step.
      "content": "i18n:<module>.tour.dashboard.steps.filter.content"
    },
    {
      // Step cuối minh họa selector bằng id như implementation hiện tại.
      "id": "summary",
      "type": "tooltip",
      "target": "#dashboard-kpi-summary",
      "placement": "auto",
      "title": "i18n:<module>.tour.dashboard.steps.summary.title",
      "content": "i18n:<module>.tour.dashboard.steps.summary.content"
    }
  ]
}
```

Page có thể override các cấu hình kế thừa từ manifest như `version`, `autoStart`, `showOnce`, `markOnDismiss`, `storage`, `storageKey`, `startDelay`, `targetTimeout`, `scrollBehavior`, `onMissingTarget`, `closeOnEscape`, `closeOnOverlayClick`, `showCloseButton`, `allowInteraction`, `allowHtml`, `progress`, `labels` và `theme`.

## 7. Đánh dấu target trong HTML

Có thể dùng các ID ổn định như:

```html
<section id="dashboard-kpi-summary">
  ...
</section>
```

Với code mới, khuyến nghị dùng attribute riêng để không phụ thuộc CSS hoặc logic component:

```html
<section data-tour="dashboard-filter">
  ...
</section>

<section data-tour="dashboard-kpi-summary">
  ...
</section>
```

JSON tương ứng:

```json
{
  "type": "tooltip",
  "target": "[data-tour=\"dashboard-kpi-summary\"]"
}
```

`target` là CSS selector hợp lệ cho `document.querySelector()`:

- hợp lệ: `#dashboard-filter`;
- hợp lệ: `[data-tour="dashboard-filter"]`;
- hợp lệ: `.filter-panel button[type="submit"]`;
- không hợp lệ: `#`;
- không hỗ trợ trực tiếp: XPath, phần tử bên trong iframe hoặc phần tử nằm trong Shadow DOM;
- nếu selector khớp nhiều phần tử, thư viện dùng phần tử đầu tiên.

Target cần tồn tại và nhìn thấy được khi step chạy. Nếu component render bất đồng bộ, tăng `targetTimeout` hoặc đặt step sau thời điểm dữ liệu/UI đã render.

## 8. Thêm nút mở lại hướng dẫn trên page

Trong component:

```ts
import { Component, inject } from '@angular/core';
import { ProductTourService } from 'product-tour-js/angular';

@Component({
  selector: 'jhi-dashboard',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  // Service đã được provider ở bootstrap.ts tạo và quản lý toàn ứng dụng.
  private readonly productTourService = inject(ProductTourService);

  startDashboardTour(): void {
    // pageId phải trùng với id trong pages/dashboard.json.
    // startPage mặc định reload manifest và force chạy lại, kể cả tour đã hoàn tất.
    void this.productTourService.startPage('dashboard').catch(error => {
      console.error('Không thể mở hướng dẫn Dashboard', error);
    });
  }
}
```

Trong template:

```html
<button type="button" class="tour-button" (click)="startDashboardTour()">
  <mat-icon>help_outline</mat-icon>
  {{ '<module>.tour.dashboard.start' | translate }}
</button>
```

Không thêm `ProductTourService` vào `providers` của component vì sẽ tạo instance riêng. Không cần thêm Product Tour vào `imports` của `@Component`.

## 9. Cấu hình đa ngôn ngữ

Với cấu trúc translation của Kyta, thêm cùng một cây key vào file tiếng Việt và tiếng Anh của module.

Ví dụ `src/main/webapp/i18n/vi/<module>.json`:

```jsonc
{
  "<module>": {
    "tour": {
      // Nhãn dùng chung cho tất cả page.
      "labels": {
        "next": "Tiếp",
        "previous": "Quay lại",
        "finish": "Hoàn tất",
        "skip": "Bỏ qua",
        "close": "Đóng",
        "progress": "Bước {current}/{total}",
        "required": "Vui lòng điền đầy đủ thông tin bắt buộc."
      },
      // Nội dung riêng của page dashboard.
      "dashboard": {
        // Text của nút mở lại tour.
        "start": "Hướng dẫn",
        "steps": {
          // Key phải trùng phần sau i18n: trong dashboard.json.
          "welcome": {
            "title": "Tổng quan",
            "content": "Khám phá các chức năng chính trên màn hình này."
          },
          "filter": {
            "title": "Bộ lọc",
            "content": "Chọn điều kiện để giới hạn dữ liệu hiển thị."
          },
          "summary": {
            "title": "Chỉ số tổng hợp",
            "content": "Xem nhanh các chỉ số quan trọng."
          }
        }
      }
    }
  }
}
```

File `src/main/webapp/i18n/en/<module>.json` phải giữ nguyên cấu trúc key, chỉ thay nội dung dịch.

Quy tắc key:

```text
i18n:<module>.tour.<page-id>.steps.<step-id>.title
i18n:<module>.tour.<page-id>.steps.<step-id>.content
```

Adapter `provideProductTourNgxTranslate` bỏ prefix `i18n:` rồi gọi `TranslateService` để lấy bản dịch. Đây là adapter chuẩn và duy nhất được dùng cho các module Kyta.

## 10. Tham chiếu nhanh các cấu hình nâng cao

### Route matcher

```jsonc
{
  "match": {
    // Path cần so khớp.
    "path": "*/feature/*",
    // exact, prefix hoặc glob.
    "mode": "glob",
    // Tùy chọn: hash bắt buộc phải khớp.
    "hash": "#detail",
    // Tùy chọn: các query parameter bắt buộc phải khớp.
    "query": {
      "tab": "general"
    }
  }
}
```

### Step dạng câu hỏi

```jsonc
{
  "id": "experience",
  // question hiển thị form trong popover/modal.
  "type": "question",
  "title": "Đánh giá trải nghiệm",
  "fields": [
    {
      // Tên field trong object kết quả.
      "name": "rating",
      // text, radio hoặc checkbox.
      "type": "radio",
      // Nhãn hiển thị của field.
      "label": "Mức độ hài lòng",
      // Mô tả bổ sung.
      "description": "Chọn một mức phù hợp nhất.",
      // Bắt buộc người dùng trả lời.
      "required": true,
      // Thông báo validation riêng cho field.
      "validationMessage": "Vui lòng chọn một mức.",
      // Các lựa chọn; value là dữ liệu được lưu.
      "options": [
        { "label": "Tốt", "value": "good" },
        { "label": "Bình thường", "value": "normal" },
        { "label": "Cần cải thiện", "value": "bad", "disabled": false }
      ],
      // Giá trị được chọn ban đầu.
      "defaultValue": "good"
    }
  ]
}
```

### Nút hành động tùy chỉnh

```jsonc
{
  "actions": [
    {
      // ID tùy chọn của action.
      "id": "back",
      // Text hoặc key i18n của nút.
      "label": "Quay lại",
      // next, back, finish, dismiss, goTo hoặc emit.
      "action": "back",
      // primary, secondary hoặc link.
      "variant": "secondary"
    },
    {
      "id": "open-detail",
      "label": "Xem chi tiết",
      // Phát custom event để application tự xử lý.
      "action": "emit",
      // Tên event được phát.
      "event": "open-feature-detail",
      "variant": "primary"
    }
  ]
}
```

Với action `goTo`, thêm `targetStep` là ID của step đích.

### Rẽ nhánh bằng câu trả lời

```jsonc
{
  "next": [
    {
      // Step đích khi điều kiện đúng.
      "stepId": "advanced-help",
      "when": {
        // Field cần kiểm tra.
        "field": "experienceLevel",
        // Nếu field thuộc question step khác, khai báo stepId nguồn.
        "stepId": "profile-question",
        // Điều kiện hỗ trợ: equals, notEquals, includes hoặc exists.
        "equals": "advanced"
      }
    },
    {
      // Rule không có when đóng vai trò fallback.
      "stepId": "basic-help"
    }
  ]
}
```

## 11. Quy tắc vận hành cho các module Kyta

1. Mỗi page có một `page.id` duy nhất và một file riêng trong `pages/`.
2. Tên file nên trùng `page.id`, dùng kebab-case: `feature-detail.json`.
3. Ưu tiên selector `[data-tour="..."]`; không dùng class chỉ phục vụ style.
4. Mọi `title`, `content`, label hiển thị cho người dùng nên dùng `i18n:`.
5. Dùng `placement: "auto"` nếu layout thay đổi theo kích thước màn hình.
6. Dùng `onMissingTarget: "skip"` khi quyền user hoặc dữ liệu có thể làm target không xuất hiện.
7. Tăng `version` khi muốn tour tự hiện lại sau một lần cập nhật nội dung.
8. Nút “Hướng dẫn” gọi `startPage(pageId)` để người dùng chủ động xem lại.
9. Không đặt secret, token, thông tin nội bộ nhạy cảm hoặc dữ liệu người dùng trong JSON/i18n public.
10. Kiểm tra cả tiếng Việt, tiếng Anh, responsive layout và các role có UI khác nhau.

## 12. Checklist tích hợp một page mới

- [ ] Thêm các `data-tour` hoặc `id` ổn định vào template.
- [ ] Tạo `content/product-tours/pages/<page-id>.json`.
- [ ] Thêm file page vào `include` của `product-tour.json`.
- [ ] Thêm key dịch vào cả `i18n/vi` và `i18n/en`.
- [ ] Kiểm tra `match.path` khớp URL thật sau `baseHref`.
- [ ] Nếu cần nút xem lại, inject `ProductTourService` và gọi `startPage(pageId)`.
- [ ] Mở trực tiếp URL của manifest trên môi trường chạy để chắc chắn không bị 404.
- [ ] Kiểm tra Console/Network không có lỗi fetch, parse JSON hoặc thiếu translation key.
- [ ] Test user đã xem tour, user mới, thao tác đóng giữa chừng và đổi ngôn ngữ.
- [ ] Test target render chậm, target không tồn tại và layout mobile.

## 13. Xử lý lỗi thường gặp

### Manifest bị 404

- Kiểm tra `src/main/webapp/content` có trong `angular.json > assets`.
- Dùng `content/product-tours/product-tour.json` nếu application có `baseHref` riêng.
- Mở trực tiếp URL manifest trên browser để kiểm tra.

### Hiển thị nguyên chuỗi `i18n:...`

- Đảm bảo provider Kyta được import từ `product-tour-js/angular/ngx-translate` và chỉ khai báo đúng `source`.
- Kiểm tra key tồn tại trong file ngôn ngữ đã được load.
- Kiểm tra prefix là `i18n:`.

### Tour không tự hiện

- Kiểm tra `autoStart`, `enabled`, `match` và `showOnce`.
- Nếu tour đã hoàn tất, tăng `version` hoặc dùng nút gọi `startPage(pageId)`.
- Kiểm tra completion key trong Local Storage nếu đang debug.

### Tooltip bỏ qua step

- Kiểm tra selector bằng `document.querySelector('<selector>')` trong DevTools.
- Tăng `targetTimeout` nếu target render bất đồng bộ.
- Kiểm tra target không bị ẩn bởi điều kiện role/quyền hoặc `*ngIf`.

### Nội dung mới chưa được cập nhật

- `ProductTourService.startPage()` mặc định reload và cache-bust manifest.
- Kiểm tra cache của reverse proxy/CDN nếu file vẫn cũ.
- Tăng `version` nếu mục tiêu là hiển thị lại tour cho người đã hoàn tất.

