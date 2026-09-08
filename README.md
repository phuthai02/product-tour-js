# product-tour-js

[![npm version](https://img.shields.io/npm/v/product-tour-js.svg)](https://www.npmjs.com/package/product-tour-js)
[![npm downloads](https://img.shields.io/npm/dw/product-tour-js.svg)](https://www.npmjs.com/package/product-tour-js)
[![license](https://img.shields.io/npm/l/product-tour-js.svg)](./LICENSE)

Thư viện product tour viết bằng JavaScript thuần, không phụ thuộc framework và cấu hình bằng JSON. Một tour có thể kết hợp modal chào mừng, tooltip trỏ vào phần tử, câu hỏi, rẽ nhánh theo câu trả lời, nhiều page và nhiều file JSON.

Package hỗ trợ ESM, CommonJS, browser bundle và TypeScript.

Các badge npm ở trên lấy dữ liệu trực tiếp từ registry. README trên nhánh `main` mô tả code mới nhất trong repository; xem mục [Trạng thái phiên bản](#trạng-thái-phiên-bản) để phân biệt với bản npm đang phát hành.

## Mục lục

- [Cài đặt](#cài-đặt)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Nguồn cấu hình JSON](#nguồn-cấu-hình-json)
- [Các loại step](#các-loại-step)
- [Câu hỏi và dữ liệu trả lời](#câu-hỏi-và-dữ-liệu-trả-lời)
- [Nút và hành động](#nút-và-hành-động)
- [Flow rẽ nhánh](#flow-rẽ-nhánh)
- [Cấu hình nút đóng](#cấu-hình-nút-đóng)
- [Hiển thị tiến độ](#hiển-thị-tiến-độ)
- [Theme, nhãn và font chữ](#theme-nhãn-và-font-chữ)
- [Chỉ hiện với user mới](#chỉ-hiện-với-user-mới)
- [Nhiều page trong một ứng dụng](#nhiều-page-trong-một-ứng-dụng)
- [Tách cấu hình thành nhiều file JSON](#tách-cấu-hình-thành-nhiều-file-json)
- [Gửi kết quả về API](#gửi-kết-quả-về-api)
- [Dùng chung trong mọi framework](#dùng-chung-trong-mọi-framework)
- [JavaScript API](#javascript-api)
- [Bảng cấu hình đầy đủ](#bảng-cấu-hình-đầy-đủ)
- [JSON Schema](#json-schema)
- [Bàn phím và accessibility](#bàn-phím-và-accessibility)
- [Chạy demo, test package và publish npm](#chạy-demo-test-package-và-publish-npm)
- [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)
- [Trạng thái phiên bản](#trạng-thái-phiên-bản)

## Tính năng chính

- Không phụ thuộc React, Vue, Angular hay framework UI khác.
- Đọc cấu hình từ object JavaScript, một file JSON hoặc manifest gồm nhiều file JSON.
- Hỗ trợ `tooltip`, `modal` và `question` trong cùng một flow.
- Field câu hỏi gồm `text`, `radio` và `checkbox`.
- Rẽ nhánh theo câu trả lời.
- Nút tùy chỉnh với các action `next`, `back`, `finish`, `dismiss`, `goTo` và `emit`.
- Tiến độ dạng text, chấm tròn hoặc thanh ngang chia đoạn.
- Mỗi route/page có tour riêng và có thể kế thừa cấu hình chung.
- Theo dõi route của SPA khi bật `watchRoutes`.
- Tự đưa target bị khuất vào viewport; có thể chọn cuộn `smooth` hoặc `auto`.
- Ẩn tooltip và spotlight cũ trong khi auto-scroll, đồng thời khóa cuộn nền.
- `ProductTourService` quản lý manifest, cache-bust và i18n cho mọi framework.
- Ghi nhớ trạng thái hoàn tất bằng `localStorage` hoặc `sessionStorage`.
- Trả kết quả qua callback, API của instance và DOM event.
- Tự chèn CSS khi tour chạy, không cần import thêm file CSS.

## Cài đặt

Yêu cầu Node.js 18 trở lên khi phát triển hoặc build package.

```bash
npm install product-tour-js
```

### ESM

```js
import { initProductTour } from "product-tour-js";
```

### CommonJS

```js
const { initProductTour } = require("product-tour-js");
```

### TypeScript

Package đã chứa declaration file nên không cần cài `@types`:

```ts
import {
  initProductTour,
  type ProductTourConfig,
  type TourAnswers
} from "product-tour-js";

const config: ProductTourConfig = {
  id: "welcome",
  steps: [
    {
      type: "modal",
      title: "Chào mừng",
      content: "Bắt đầu sử dụng ứng dụng."
    }
  ]
};

const tour = await initProductTour(config);
const answers: TourAnswers = tour.getAnswers();
```

### Browser bundle/CDN

```html
<script src="https://unpkg.com/product-tour-js@latest/dist/product-tour.min.js"></script>
<script>
  ProductTourJS.initProductTour("/product-tour.json");
</script>
```

Khi dùng browser bundle, các API được đặt trong global `ProductTourJS`.

## Bắt đầu nhanh

### 1. Tạo phần tử cần được hướng dẫn

```html
<button id="create-button">Tạo dự án</button>
```

### 2. Tạo file cấu hình

Với Vite, React, Vue hoặc ứng dụng có thư mục `public`, đặt file tại `public/product-tour.json`:

```json
{
  "id": "main-onboarding",
  "version": 1,
  "autoStart": true,
  "showOnce": true,
  "scrollBehavior": "smooth",
  "labels": {
    "next": "Tiếp",
    "previous": "Quay lại",
    "finish": "Hoàn tất",
    "skip": "Bỏ qua",
    "close": "Đóng",
    "progress": "Bước {current}/{total}"
  },
  "steps": [
    {
      "id": "welcome",
      "type": "modal",
      "title": "Chào mừng!",
      "content": "Đây là phần giới thiệu nhanh."
    },
    {
      "id": "create",
      "type": "tooltip",
      "target": "#create-button",
      "title": "Tạo dự án",
      "content": "Bắt đầu từ nút này.",
      "placement": "bottom"
    }
  ]
}
```

### 3. Khởi tạo tour

```js
import { initProductTour } from "product-tour-js";

const tour = await initProductTour("/product-tour.json");
```

`autoStart: true` làm tour chạy ngay sau khi file được tải. Biến `tour` là instance để ứng dụng có thể điều khiển tour về sau.

## Nguồn cấu hình JSON

### Tải từ một URL

Đây là cách phù hợp nhất khi muốn sửa nội dung tour mà không sửa code khởi tạo:

```js
const tour = await initProductTour("/config/onboarding.json");
```

Đường dẫn bắt đầu bằng `/` được tính từ domain của ứng dụng. Đường dẫn không bắt đầu bằng `/` được tính tương đối từ URL hiện tại.

Trình duyệt chỉ tải được URL mà trang có quyền truy cập. Nếu file nằm ở domain khác, server chứa JSON phải cấu hình CORS.

### Truyền trực tiếp object

```js
import { initProductTour } from "product-tour-js";

const tour = await initProductTour({
  id: "inline-tour",
  steps: [
    {
      type: "modal",
      title: "Chào mừng",
      content: "Cấu hình được truyền trực tiếp."
    }
  ]
});
```

### Import file JSON bằng bundler

```js
import config from "./product-tour.json" with { type: "json" };
import { initProductTour } from "product-tour-js";

const tour = await initProductTour(config);
```

Khả năng import JSON phụ thuộc bundler và cấu hình của project. Cách tải bằng URL không phụ thuộc tính năng import JSON.

### Chọn hàm khởi tạo

| Nhu cầu | Hàm nên dùng |
| --- | --- |
| Một tour, một danh sách `steps` | `initProductTour` |
| Nhiều page/route, có `pages` hoặc `include` | `initProductTours` |
| Chỉ tải và kiểm tra một config | `loadTourConfig` |
| Chỉ tải và nối manifest nhiều page | `loadTourManifest` |
| Chuẩn hóa object một tour | `defineTourConfig` |
| Chuẩn hóa object nhiều page | `defineTourManifest` |
| Dùng lại lifecycle, reload và i18n trong mọi framework | `createProductTourService` |

## Các loại step

Một danh sách `steps` có thể trộn cả ba loại dưới đây.

### Modal

Modal không cần `target` và được đặt giữa màn hình:

```json
{
  "id": "welcome",
  "type": "modal",
  "title": "Chào mừng đến Acme",
  "content": "Tour này mất khoảng một phút."
}
```

Khi nội dung modal cao hơn màn hình, modal vẫn cuộn được nhưng thanh cuộn dọc và ngang được ẩn.

### Tooltip

Tooltip bắt buộc có `target` là một CSS selector hợp lệ:

```json
{
  "id": "search-tip",
  "type": "tooltip",
  "target": "#search",
  "title": "Tìm kiếm",
  "content": "Tìm dự án theo tên hoặc mã.",
  "placement": "bottom",
  "padding": 10,
  "allowInteraction": true
}
```

Các giá trị `placement`:

| Giá trị | Vị trí mong muốn |
| --- | --- |
| `auto` | Tự chọn phía còn đủ chỗ |
| `top` | Phía trên target |
| `right` | Bên phải target |
| `bottom` | Phía dưới target |
| `left` | Bên trái target |
| `center` | Giữa màn hình |

Nếu vị trí chỉ định không đủ chỗ, thư viện có thể chọn phía phù hợp hơn để popover không tràn viewport.

Khi target bị khuất một phần hoặc nằm ngoài viewport, thư viện tự cuộn target vào vùng nhìn thấy tốt nhất có thể. Trong lúc cuộn, tooltip hiện tại được ẩn và tooltip của step mới chỉ xuất hiện sau khi thao tác cuộn đã ổn định. Chuyển động cuộn tự động tôn trọng thiết lập `prefers-reduced-motion` của user.

Mặc định tour cuộn mượt. Đặt `scrollBehavior: "auto"` ở cấp tour nếu muốn chuyển ngay đến target. Trong lúc auto-scroll, cả tooltip và vùng spotlight của target cũ được ẩn; chúng chỉ xuất hiện lại tại target mới sau khi cuộn ổn định.

```json
{
  "scrollBehavior": "auto",
  "steps": [
    { "target": "#search", "title": "Tìm kiếm" }
  ]
}
```

Trong khi tour đang mở, trang và vùng target được khóa cuộn bằng chuột hoặc thao tác chạm để spotlight không bị lệch ngoài ý muốn. Nội dung bên trong popover vẫn cuộn được nếu dài hơn chiều cao khả dụng.

`allowInteraction: true` cho phép user click vào target đang được spotlight. Đặt thành `false` để chặn tương tác với target trong step đó.

Tự chuyển step khi user click target:

```json
{
  "type": "tooltip",
  "target": "#create-button",
  "title": "Hãy bấm nút này",
  "nextOnTargetClick": true
}
```

### Question

Question hiển thị form ở giữa màn hình. Tương tự modal, nội dung dài vẫn cuộn được nhưng scrollbar được ẩn:

```json
{
  "id": "profile",
  "type": "question",
  "title": "Cá nhân hóa trải nghiệm",
  "content": "Hãy cho chúng tôi biết nhu cầu của bạn.",
  "fields": [
    {
      "name": "displayName",
      "type": "text",
      "label": "Tên hiển thị",
      "placeholder": "Ví dụ: Minh",
      "required": true,
      "validationMessage": "Vui lòng nhập tên."
    },
    {
      "name": "role",
      "type": "radio",
      "label": "Vai trò",
      "required": true,
      "options": [
        { "label": "Developer", "value": "developer" },
        { "label": "Quản lý sản phẩm", "value": "manager" }
      ]
    },
    {
      "name": "topics",
      "type": "checkbox",
      "label": "Chủ đề quan tâm",
      "options": [
        { "label": "Tự động hóa", "value": "automation" },
        { "label": "Báo cáo", "value": "reporting" }
      ]
    },
    {
      "name": "receiveTips",
      "type": "checkbox",
      "label": "Nhận mẹo sử dụng"
    }
  ]
}
```

## Câu hỏi và dữ liệu trả lời

### Các loại field

| `type` | Cấu hình | Giá trị trả về mặc định |
| --- | --- | --- |
| `text` | Input một dòng | Chuỗi `""` |
| `radio` | Bắt buộc có `options` | Một `value` hoặc `null` |
| `checkbox` có `options` | Chọn nhiều đáp án | Mảng `[]` |
| `checkbox` không có `options` | Một lựa chọn bật/tắt | Boolean `false` |

### Cấu hình field

| Field | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `name` | Có | Key dùng trong object kết quả; phải duy nhất trong step |
| `type` | Không | `text`, `radio` hoặc `checkbox`; mặc định `text` |
| `label` | Không | Nhãn hiển thị; mặc định dùng `name` |
| `description` | Không | Chú thích bổ sung |
| `placeholder` | Không | Placeholder cho `text` |
| `required` | Không | Không cho đi tiếp nếu chưa có giá trị hợp lệ |
| `options` | Tùy type | Danh sách lựa chọn |
| `defaultValue` | Không | Giá trị ban đầu |
| `validationMessage` | Không | Lỗi riêng cho field bắt buộc |

Option có thể viết ngắn:

```json
{
  "name": "role",
  "type": "radio",
  "options": ["developer", "manager"]
}
```

Hoặc viết đầy đủ để label khác value và có thể vô hiệu hóa một lựa chọn:

```json
{
  "name": "plan",
  "type": "radio",
  "options": [
    { "label": "Miễn phí", "value": "free" },
    { "label": "Doanh nghiệp - sắp ra mắt", "value": "enterprise", "disabled": true }
  ]
}
```

### Cấu trúc kết quả

Kết quả được nhóm theo `step.id`, sau đó theo `field.name`:

```json
{
  "profile": {
    "displayName": "Minh",
    "role": "developer",
    "topics": ["automation", "reporting"],
    "receiveTips": true
  }
}
```

Đọc hoặc đặt câu trả lời bằng JavaScript:

```js
console.log(tour.getAnswers());
console.log(tour.getAnswer("profile", "role"));

tour.setAnswer("profile", "role", "developer");
```

Có thể truyền dữ liệu ban đầu khi khởi tạo:

```js
const tour = await initProductTour("/product-tour.json", {
  initialAnswers: {
    profile: {
      displayName: "Minh",
      role: "developer"
    }
  }
});
```

## Nút và hành động

Nếu một step không có `actions`, thư viện tự tạo các nút:

- `Bỏ qua`.
- `Quay lại` từ step thứ hai trở đi.
- `Tiếp` hoặc `Hoàn tất`.

Khai báo `actions` để thay thế toàn bộ danh sách mặc định:

```json
{
  "id": "welcome",
  "type": "modal",
  "title": "Chào mừng",
  "actions": [
    {
      "id": "later",
      "label": "Để sau",
      "action": "dismiss",
      "variant": "link"
    },
    {
      "id": "start",
      "label": "Bắt đầu",
      "action": "next",
      "variant": "primary"
    }
  ]
}
```

### Các action

| `action` | Hành vi | Cấu hình thêm |
| --- | --- | --- |
| `next` | Kiểm tra question rồi sang step kế tiếp | Không |
| `back` | Quay về step trước theo lịch sử flow | Không |
| `finish` | Kiểm tra question, hoàn tất tour | Không |
| `dismiss` | Đóng/bỏ qua tour | Không |
| `goTo` | Đi đến một step cụ thể | `targetStep` |
| `emit` | Phát event để ứng dụng tự xử lý | `event` |

Các variant giao diện là `primary`, `secondary` và `link`.

Ví dụ `goTo`:

```json
{
  "actions": [
    {
      "id": "open-advanced",
      "label": "Hướng dẫn nâng cao",
      "action": "goTo",
      "targetStep": "advanced-tour",
      "variant": "primary"
    }
  ]
}
```

Ví dụ `emit`:

```json
{
  "actions": [
    {
      "id": "open-docs",
      "label": "Mở tài liệu",
      "action": "emit",
      "event": "open-docs",
      "variant": "secondary"
    }
  ]
}
```

```js
document.addEventListener("product-tour:open-docs", () => {
  window.open("/docs", "_blank");
});
```

Action `emit` chỉ phát sự kiện, không tự chuyển step. Ứng dụng có thể gọi `tour.next()` sau khi xử lý nếu cần.

## Flow rẽ nhánh

### Chuyển thẳng đến một step

```json
{
  "id": "intro",
  "type": "modal",
  "title": "Bắt đầu",
  "next": "final-step"
}
```

### Rẽ nhánh theo câu trả lời

```json
{
  "id": "profile",
  "type": "question",
  "title": "Vai trò của bạn",
  "fields": [
    {
      "name": "role",
      "type": "radio",
      "required": true,
      "options": ["developer", "manager"]
    }
  ],
  "next": [
    {
      "when": {
        "field": "role",
        "equals": "developer"
      },
      "stepId": "developer-tour"
    },
    {
      "stepId": "manager-tour"
    }
  ]
}
```

Rule không có `when` đóng vai trò fallback. Nên đặt fallback cuối danh sách vì thư viện chọn rule khớp đầu tiên.

Các điều kiện hỗ trợ:

| Điều kiện | Ý nghĩa |
| --- | --- |
| `equals` | Giá trị bằng giá trị cấu hình |
| `notEquals` | Giá trị khác giá trị cấu hình |
| `includes` | Mảng chứa value hoặc chuỗi chứa đoạn text |
| `exists` | `true` nếu đã có giá trị; `false` nếu chưa có |

Mặc định condition đọc field trong question hiện tại. Dùng `stepId` bên trong `when` để tham chiếu câu trả lời của question trước:

```json
{
  "when": {
    "stepId": "profile",
    "field": "topics",
    "includes": "automation"
  },
  "stepId": "automation-tip"
}
```

Mọi `stepId` được tham chiếu bởi `next`, `goTo` hoặc rule phải tồn tại trong cùng tour.

## Cấu hình nút đóng

### Bật hoặc tắt cho toàn tour

```json
{
  "showCloseButton": false,
  "steps": [
    {
      "type": "modal",
      "title": "Không hiện dấu ×"
    }
  ]
}
```

Mặc định `showCloseButton` là `true`.

### Ghi đè riêng từng step

```json
{
  "showCloseButton": false,
  "steps": [
    {
      "id": "required-question",
      "type": "question",
      "title": "Không có nút đóng",
      "fields": [
        { "name": "name", "type": "text", "required": true }
      ]
    },
    {
      "id": "optional-tip",
      "type": "tooltip",
      "target": "#help",
      "title": "Có nút đóng",
      "showCloseButton": true
    }
  ]
}
```

### Phân biệt các cách đóng tour

| Cấu hình | Tác dụng |
| --- | --- |
| `showCloseButton` | Chỉ bật/tắt nút dấu `×` |
| `closeOnEscape` | Cho phép phím Escape đóng tour |
| `closeOnOverlayClick` | Cho phép click nền tối đóng tour |
| Action `dismiss` | Hiển thị nút bỏ qua/đóng trong footer |

Ẩn hoàn toàn các lối đóng tự do:

```json
{
  "showCloseButton": false,
  "closeOnEscape": false,
  "closeOnOverlayClick": false,
  "steps": [
    {
      "type": "modal",
      "title": "Bắt buộc hoàn tất",
      "actions": [
        {
          "label": "Tiếp tục",
          "action": "next",
          "variant": "primary"
        }
      ]
    }
  ]
}
```

Cần tự khai báo `actions` không chứa `dismiss` vì action mặc định luôn có nút `Bỏ qua`.

## Hiển thị tiến độ

`progress` có thể đặt ở tour chính, manifest chung, từng page hoặc từng step.

```json
{
  "progress": {
    "type": "dots",
    "position": "top-center"
  }
}
```

### Kiểu tiến độ

| `type` | Hiển thị |
| --- | --- |
| `none` | Không hiện tiến độ |
| `text` | Text theo `labels.progress`, ví dụ `Bước 2/5` |
| `dots` | Dãy chấm tròn |
| `bar` | Thanh mỏng chia thành từng đoạn theo số step |

Với `dots` và `bar`, step hiện tại dùng màu accent đậm hơn; kích thước không thay đổi. Các đoạn chưa đến dùng màu nhạt.

### Vị trí tiến độ

- `top-left`
- `top-center`
- `top-right`
- `bottom-left`
- `bottom-center`
- `bottom-right`

Ví dụ thanh chia đoạn ở dưới, căn giữa:

```json
{
  "progress": {
    "type": "bar",
    "position": "bottom-center"
  }
}
```

Tắt tiến độ riêng một step:

```json
{
  "id": "welcome",
  "type": "modal",
  "title": "Chào mừng",
  "progress": {
    "type": "none"
  }
}
```

## Theme, nhãn và font chữ

### Theme

```json
{
  "theme": {
    "accentColor": "#7c3aed",
    "overlayColor": "rgba(15, 23, 42, 0.72)",
    "borderRadius": "14px",
    "zIndex": 2147483000
  }
}
```

| Field | Mặc định | Tác dụng |
| --- | --- | --- |
| `accentColor` | `#2563eb` | Nút chính, input được chọn, spotlight và progress active |
| `overlayColor` | `rgba(15, 23, 42, 0.68)` | Màu nền tối |
| `borderRadius` | `12px` | Bo góc popover và spotlight |
| `zIndex` | `2147483000` | Lớp hiển thị gốc của tour |

### Nhãn

```json
{
  "labels": {
    "next": "Tiếp",
    "previous": "Quay lại",
    "finish": "Hoàn tất",
    "skip": "Bỏ qua",
    "close": "Đóng",
    "progress": "Bước {current}/{total}",
    "required": "Vui lòng trả lời trường bắt buộc."
  }
}
```

`labels.close` là accessibility label của nút `×`, không thay dấu `×` thành text.

### Font chữ

Thư viện mặc định dùng system font:

```css
ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Font không tự lấy từ module hoặc component đã import. Muốn tour dùng font của ứng dụng, thêm CSS có độ ưu tiên cao hơn:

```css
body .pt-root {
  font-family: "Inter", sans-serif;
}
```

Các màu text và nền mặc định nằm trong CSS của thư viện; `theme` chỉ thay đổi những giá trị được liệt kê ở trên.

### Nội dung HTML

Mặc định `content` được render như text an toàn. Chỉ bật HTML khi toàn bộ JSON là nguồn đáng tin cậy:

```json
{
  "allowHtml": true,
  "steps": [
    {
      "type": "modal",
      "content": "Xem <strong>tính năng mới</strong>."
    }
  ]
}
```

`allowHtml: true` không sanitize HTML và có thể tạo lỗ hổng XSS nếu nội dung đến từ user hoặc nguồn không đáng tin.

## Chỉ hiện với user mới

Mặc định tour có:

```json
{
  "autoStart": true,
  "showOnce": true,
  "markOnDismiss": true,
  "storage": "local"
}
```

Sau khi hoàn tất, thư viện lưu:

```text
<storageKey>:<id>:v<version>
```

Với giá trị mặc định và `id: "welcome"`, `version: 2`:

```text
product-tour:welcome:v2
```

### Ý nghĩa các lựa chọn

| Cấu hình | Hành vi |
| --- | --- |
| `autoStart: true` | Tự chạy sau khi tải config |
| `autoStart: false` | Chỉ tạo instance, ứng dụng tự gọi `start()` |
| `showOnce: true` | Bỏ qua nếu completion key đã tồn tại |
| `showOnce: false` | Tour có thể chạy lại mà không cần reset |
| `markOnDismiss: true` | Dismiss cũng được ghi nhớ như đã xem |
| `markOnDismiss: false` | Dismiss không ghi completion key |
| `storage: "local"` | Nhớ qua nhiều phiên trình duyệt |
| `storage: "session"` | Chỉ nhớ trong session/tab hiện tại |
| `storage: "none"` | Không lưu trạng thái |

Hiện lại tour:

```js
tour.reset();
await tour.start();
```

Hoặc tăng `version` trong JSON khi phát hành một phiên bản onboarding mới.

Ép chạy mà không xóa completion key:

```js
await tour.start({ force: true });
```

## Nhiều page trong một ứng dụng

Dùng `pages` và khởi tạo bằng `initProductTours`:

```json
{
  "id": "app-onboarding",
  "version": 1,
  "watchRoutes": true,
  "showOnce": true,
  "showCloseButton": true,
  "theme": {
    "accentColor": "#7c3aed"
  },
  "progress": {
    "type": "dots",
    "position": "top-center"
  },
  "pages": [
    {
      "id": "dashboard",
      "match": "/dashboard",
      "steps": [
        {
          "type": "modal",
          "title": "Dashboard",
          "content": "Chào mừng đến dashboard."
        },
        {
          "type": "tooltip",
          "target": "#create-button",
          "title": "Tạo dự án"
        }
      ]
    },
    {
      "id": "settings",
      "match": {
        "path": "/settings",
        "query": {
          "tab": "profile"
        }
      },
      "showCloseButton": false,
      "theme": {
        "accentColor": "#0891b2"
      },
      "progress": {
        "type": "bar",
        "position": "bottom-center"
      },
      "steps": [
        {
          "type": "tooltip",
          "target": "#profile-form",
          "title": "Hồ sơ của bạn"
        }
      ]
    },
    {
      "id": "project-detail",
      "match": {
        "path": "/projects/:id",
        "mode": "glob"
      },
      "steps": [
        {
          "type": "modal",
          "title": "Chi tiết dự án"
        }
      ]
    }
  ]
}
```

```js
import { initProductTours } from "product-tour-js";

const manager = await initProductTours("/product-tour.json", {
  onPageChange(pageId, tour) {
    console.log("Page tour hiện tại:", pageId, tour);
  }
});
```

### Route matching

| Cấu hình | Ví dụ | Hành vi |
| --- | --- | --- |
| Chuỗi | `"/dashboard"` | Khớp path chính xác |
| `mode: "exact"` | `"/settings"` | Khớp path chính xác |
| `mode: "prefix"` | `"/docs"` | Khớp `/docs` và mọi path bắt đầu bằng `/docs` |
| `mode: "glob"` | `"/projects/:id"` | Khớp route parameter |
| `mode: "glob"` | `"/admin/*"` | Khớp wildcard |
| `query` | `{ "tab": "profile" }` | Các query khai báo phải khớp |
| `hash` | `"#billing"` | Hash phải khớp |
| `enabled: false` | — | Tạm vô hiệu hóa page |

Nếu nhiều page cùng khớp một URL, page xuất hiện trước trong danh sách được chọn.

### watchRoutes làm gì?

`watchRoutes: true` theo dõi:

- Lần tải trang đầu tiên.
- Back và Forward.
- Thay đổi hash.
- `history.pushState()`.
- `history.replaceState()`.

Khi route thay đổi, manager dừng tour của page cũ và tìm tour khớp page mới.

`watchRoutes` không tự đổi route và không tự chuyển user sang page khác. Ứng dụng vẫn chịu trách nhiệm điều hướng. Nếu đặt `watchRoutes: false`, gọi `manager.refresh()` sau khi ứng dụng đổi route.

### Kế thừa cấu hình

Các option chung như `version`, `showOnce`, `storage`, `scrollBehavior`, `labels`, `theme`, `progress` và `showCloseButton` được kế thừa từ manifest xuống page. Page có thể override giá trị riêng.

Mỗi page dùng completion key riêng dựa trên id `<manifest-id>:<page-id>`. Hoàn tất tour Dashboard không làm mất tour Settings.

## Tách cấu hình thành nhiều file JSON

Có thể để một số page chung file và một số page có file riêng. Tất cả được nối thành một manifest duy nhất.

### Cấu trúc thư mục minh họa

```text
public/
├─ product-tour.json
└─ tours/
   ├─ shared-pages.json
   ├─ project.json
   └─ admin.json
```

### File main: `product-tour.json`

File main chứa cấu hình chung và danh sách file con:

```json
{
  "id": "app-onboarding",
  "version": 3,
  "watchRoutes": true,
  "showOnce": true,
  "labels": {
    "next": "Tiếp",
    "previous": "Quay lại",
    "finish": "Hoàn tất"
  },
  "theme": {
    "accentColor": "#7c3aed"
  },
  "include": [
    "./tours/shared-pages.json",
    "./tours/project.json",
    "./tours/admin.json"
  ]
}
```

### File con chứa nhiều page: `tours/shared-pages.json`

```json
{
  "pages": [
    {
      "id": "home",
      "match": "/",
      "steps": [
        {
          "type": "modal",
          "title": "Trang chủ"
        }
      ]
    },
    {
      "id": "settings",
      "match": "/settings",
      "steps": [
        {
          "type": "tooltip",
          "target": "#settings-form",
          "title": "Cài đặt"
        }
      ]
    }
  ]
}
```

### File con chỉ chứa một page: `tours/project.json`

```json
{
  "id": "project",
  "match": {
    "path": "/projects/:id",
    "mode": "glob"
  },
  "theme": {
    "accentColor": "#ea580c"
  },
  "steps": [
    {
      "type": "tooltip",
      "target": "#project-panel",
      "title": "Chi tiết dự án"
    }
  ]
}
```

### File con tiếp tục include: `tours/admin.json`

Một manifest con có thể chứa `pages` và `include`:

```json
{
  "showCloseButton": false,
  "pages": [
    {
      "id": "admin-home",
      "match": "/admin",
      "steps": [
        {
          "type": "modal",
          "title": "Khu vực quản trị"
        }
      ]
    }
  ],
  "include": [
    "./admin-users.json"
  ]
}
```

Đường dẫn `include` được tính tương đối từ chính file đang chứa nó. Ví dụ `./admin-users.json` ở trên nằm cạnh `admin.json`.

### Quy tắc nối file

- Page khai báo trực tiếp trong `pages` của file main được đưa vào trước.
- Các file trong `include` được nối theo đúng thứ tự khai báo.
- Manifest con có thể tiếp tục include manifest khác.
- File chỉ chứa một page phải có `id`, `match` và `steps`.
- File chỉ chứa một page không được đồng thời chứa `pages` hoặc `include`.
- `page.id` phải duy nhất sau khi nối tất cả file.
- Include tạo vòng lặp sẽ bị từ chối.
- Cấu hình file cha được kế thừa; file con và page cụ thể có thể override.

Code khởi tạo không thay đổi:

```js
const manager = await initProductTours("/product-tour.json");
```

## Gửi kết quả về API

JSON chỉ mô tả giao diện và flow; thư viện không tự gửi câu trả lời ra ngoài. Ứng dụng quyết định endpoint, token xác thực, retry và cách xử lý lỗi.

### Gửi khi tour hoàn tất

```js
import { initProductTours } from "product-tour-js";

async function sendTourResult(payload) {
  const response = await fetch("/api/product-tour/results", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Không gửi được kết quả: HTTP " + response.status);
  }
}

const manager = await initProductTours("/product-tour.json", {
  onComplete(answers, tour, pageId) {
    sendTourResult({
      tourId: tour.config.id,
      version: tour.config.version,
      pageId,
      answers,
      completedAt: new Date().toISOString()
    }).catch((error) => {
      console.error("Lỗi gửi product tour:", error);
    });
  }
});
```

Callback `onComplete` được gọi đồng bộ và thư viện không chờ Promise gửi API hoàn tất. Vì vậy ứng dụng cần tự bắt lỗi như ví dụ trên.

### Nhận kết quả từ một tour đơn

```js
const tour = await initProductTour("/product-tour.json", {
  onComplete(answers, currentTour) {
    console.log(currentTour.config.id, answers);
  }
});
```

### Theo dõi từng câu trả lời

```js
const tour = await initProductTour("/product-tour.json", {
  onEvent(name, detail) {
    if (name === "answer") {
      console.log(detail.stepId, detail.field, detail.value);
    }
  }
});
```

Hoặc dùng DOM event:

```js
document.addEventListener("product-tour:answer", (event) => {
  console.log(event.detail);
});
```

Không nên đưa access token hoặc secret vào `product-tour.json` vì file JSON public có thể được mọi user tải xuống.

## Dùng chung trong mọi framework

`ProductTourService` gom sẵn logic tải manifest, cache-bust khi reload, dịch các chuỗi bắt đầu bằng `i18n:`, theo dõi đổi ngôn ngữ và hủy manager. Service này là JavaScript thuần, không phụ thuộc Angular, React hay Vue.

Cấu hình một instance duy nhất trong file dùng chung của application:

```js
import { createProductTourService } from "product-tour-js";
import { i18n } from "./i18n.js";

export const productTours = createProductTourService({
  source: "/content/product-tours/product-tour.json",
  translate: (key) => i18n.translate(key),
  onLanguageChange: (reload) => i18n.onLanguageChange(reload)
});

void productTours.initialize();
```

Sau đó mọi module chỉ cần import instance và sử dụng:

```js
import { productTours } from "./product-tours.js";

await productTours.startPage("booking");
```

Hook `translate` có thể trả về string hoặc Promise. Hook `onLanguageChange` nhận callback reload và có thể trả về một hàm cleanup hoặc object có method `unsubscribe()`, nên có thể nối với RxJS, EventEmitter hoặc hệ thống i18n bất kỳ.

### Angular với ngx-translate

Package cung cấp adapter riêng tại `product-tour-js/angular/ngx-translate`. Đăng ký một lần trong `bootstrap.ts` hoặc application config; adapter tự inject `TranslateService`, dịch chuỗi `i18n:`, theo dõi đổi ngôn ngữ và khởi tạo manager:

```ts
import { provideProductTourNgxTranslate } from "product-tour-js/angular/ngx-translate";

bootstrapApplication(MainComponent, {
  providers: [
    provideProductTourNgxTranslate({
      source: "/content/product-tours/product-tour.json"
    })
  ]
});
```

Nếu đặt manifest tại URL mặc định `/product-tour.json`, chỉ cần:

```ts
providers: [provideProductTourNgxTranslate()]
```

Trong bất kỳ component hoặc service nào, inject service từ Angular entry. Không cần thêm tour vào `imports` của `@Component`:

```ts
import { inject } from "@angular/core";
import { ProductTourService } from "product-tour-js/angular";

export class BookingComponent {
  private readonly productTours = inject(ProductTourService);

  showTour(): void {
    void this.productTours.startPage("booking");
  }
}
```

Nếu Angular không dùng ngx-translate, dùng adapter cơ bản:

```ts
import { provideProductTour } from "product-tour-js/angular";

bootstrapApplication(MainComponent, {
  providers: [
    provideProductTour({
      source: "/product-tour.json"
    })
  ]
});
```

`@angular/core` và `@ngx-translate/core` là optional peer dependencies. React, Vue và JavaScript thuần không tải hay phụ thuộc các Angular entry này.

Angular adapter có type fallback cho cả `moduleResolution: "node"`. Application không cần đổi sang `moduleResolution: "bundler"` chỉ để import các subpath của package.

### React, Vue và JavaScript thuần

Tạo singleton một lần trong `product-tours.ts`:

```ts
import { createProductTourService } from "product-tour-js";

export const productTours = createProductTourService({
  source: "/content/product-tours/product-tour.json",
  translate: (key) => i18n.t(key),
  onLanguageChange: (reload) => {
    i18n.on("languageChanged", reload);
    return () => i18n.off("languageChanged", reload);
  }
});

void productTours.initialize();
```

Các component hoặc module chỉ import singleton:

```ts
import { productTours } from "./product-tours";

void productTours.startPage("booking");
```

Gọi `productTours.destroy()` khi application root bị unmount nếu lifecycle của ứng dụng có bước teardown.

Các option của service:

| Option | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `source` | `/product-tour.json` | URL hoặc manifest object |
| `autoStart` | `true` | Tự chạy tour khớp route khi initialize |
| `cacheBust` | `true` | Thêm timestamp khi reload manifest |
| `translationPrefix` | `i18n:` | Prefix nhận diện translation key |
| `translate` | Không có | Hàm dịch key, sync hoặc async |
| `onLanguageChange` | Không có | Đăng ký callback khi đổi ngôn ngữ |
| `reloadOnLanguageChange` | `true` | Reload manager khi ngôn ngữ đổi |
| `runtime` | `{}` | Các runtime option chuyển cho manager |

Các method chính:

| Method | Ý nghĩa |
| --- | --- |
| `initialize()` | Đăng ký listener ngôn ngữ và tạo manager lần đầu |
| `getManager()` | Lấy manager hiện tại, tự tạo nếu chưa có |
| `startPage(pageId, options)` | Reload manifest và chạy page; mặc định `force: true` |
| `reload(options)` | Hủy manager cũ, tải lại manifest và trả manager mới |
| `destroy()` | Hủy subscription ngôn ngữ và manager |

`startPage(pageId)` mặc định reload manifest với cache-bust và chạy tour bằng `force: true`. Có thể tái sử dụng manager hiện tại hoặc tôn trọng completion key:

```js
await productTours.startPage("booking", {
  reload: false,
  force: false
});
```

Nếu `translate` không được truyền, chuỗi `i18n:...` được giữ nguyên. Nếu callback dịch trả Promise, service chờ hoàn tất toàn bộ bản dịch trước khi tạo manager.

Lỗi từ `initialize()`, `getManager()`, `startPage()` và `reload()` được trả qua Promise. Riêng lỗi reload tự động do đổi ngôn ngữ được chuyển vào callback `onError`:

```js
const productTours = createProductTourService({
  source: "/product-tour.json",
  onError: (error) => console.error("Không thể reload product tour", error)
});
```

## JavaScript API

### Hàm khởi tạo

#### `initProductTour(source, options)`

Tải, chuẩn hóa, tạo một `ProductTour` và tự chạy nếu `autoStart` bật.

```js
const tour = await initProductTour("/product-tour.json", {
  autoStart: false
});

await tour.start();
```

#### `initProductTours(source, options)`

Tải manifest nhiều page, tạo `ProductTourManager` và theo dõi route nếu được bật.

```js
const manager = await initProductTours("/product-tour.json");
```

### Runtime options

| Option | Ý nghĩa |
| --- | --- |
| `autoStart` | Override `autoStart` trong JSON |
| `watchRoutes` | Override `watchRoutes` khi khởi tạo manager |
| `initialAnswers` | Câu trả lời ban đầu |
| `onComplete` | Nhận kết quả khi tour hoàn tất |
| `onEvent` | Nhận mọi event của tour |
| `onPageChange` | Nhận page đang active của manager |
| `onError` | Nhận lỗi khi manager tự refresh do đổi route |
| `fetch` | Thay `fetch` mặc định, hữu ích cho auth/test |
| `signal` | `AbortSignal` khi tải JSON |
| `baseUrl` | Base URL để resolve include khi nguồn manifest là object |
| `storage` | Storage adapter tùy chỉnh |
| `window`, `document` | DOM adapter cho iframe hoặc test |

### ProductTour instance

| Thuộc tính/phương thức | Kết quả |
| --- | --- |
| `tour.config` | Config đã được chuẩn hóa và điền mặc định |
| `tour.state` | `ready`, `active`, `completed`, `dismissed` hoặc `destroyed` |
| `tour.currentIndex` | Index step đang hiện; `-1` khi không active |
| `tour.isActive` | Tour có đang chạy hay không |
| `tour.completionKey` | Key dùng để ghi nhớ hoàn tất |
| `tour.isCompleted()` | Kiểm tra completion key |
| `tour.start({ force })` | Bắt đầu tour |
| `tour.next()` | Sang step tiếp theo hoặc hoàn tất |
| `tour.previous()` | Quay lại theo lịch sử flow |
| `tour.goTo(idOrIndex)` | Đi đến step theo id hoặc index |
| `tour.complete()` | Hoàn tất và gọi `onComplete` |
| `tour.dismiss(reason)` | Bỏ qua/đóng tour |
| `tour.stop(reason)` | Dừng nhưng không đánh dấu hoàn tất |
| `tour.reset()` | Xóa completion key và câu trả lời |
| `tour.getAnswers()` | Lấy bản sao toàn bộ câu trả lời |
| `tour.getAnswer(stepId, field)` | Lấy một câu trả lời |
| `tour.setAnswer(stepId, field, value)` | Đặt câu trả lời từ code |
| `tour.destroy()` | Gỡ tour vĩnh viễn; instance không start lại được |

`reset({ clearAnswers: false })` xóa completion key nhưng giữ câu trả lời hiện tại.

### ProductTourManager instance

| Thuộc tính/phương thức | Kết quả |
| --- | --- |
| `manager.activePageId` | ID page đang active hoặc `null` |
| `manager.activeTour` | Tour đang active hoặc `null` |
| `manager.findPage(location)` | Tìm page khớp một URL |
| `manager.getTour(pageId)` | Lấy hoặc tạo instance của page |
| `manager.start()` | Bắt đầu manager và page hiện tại |
| `manager.refresh()` | Tìm lại page theo URL hiện tại |
| `manager.startPage(pageId)` | Chạy page cụ thể mà không đổi URL |
| `manager.reset(pageId)` | Reset một page; bỏ `pageId` để reset tất cả |
| `manager.stop()` | Dừng tour và ngừng theo dõi route |
| `manager.destroy()` | Hủy manager và tất cả instance |

`startPage(pageId)` chỉ chọn tour của page, không điều hướng trình duyệt đến URL của page đó.

### ProductTourService instance

| Thuộc tính/phương thức | Kết quả |
| --- | --- |
| `service.initialize()` | Khởi tạo manager và listener đổi ngôn ngữ |
| `service.getManager()` | Trả Promise của manager hiện tại |
| `service.startPage(id, options)` | Chạy page; mặc định reload và force |
| `service.reload(options)` | Tải lại manifest và thay manager |
| `service.destroy()` | Hủy listener và manager |

`createProductTourService(options)` là factory tương đương `new ProductTourService(options)`.

### Events

Ứng dụng có thể nhận event qua `onEvent(name, detail)` hoặc `CustomEvent` trên `document` với prefix `product-tour:`.

| Event | Khi nào được phát |
| --- | --- |
| `start` | Tour bắt đầu |
| `step` | Một step được render |
| `answer` | Một câu trả lời thay đổi |
| `action` | User bấm một action |
| `validationerror` | Question bắt buộc chưa hợp lệ |
| `complete` | Tour hoàn tất |
| `dismiss` | Tour bị đóng/bỏ qua |
| `stop` | Tour bị dừng mà không hoàn tất |
| `missingtarget` | Không tìm thấy target |
| `skip` | Không chạy vì tour đã hoàn tất trước đó |
| `reset` | Tour được reset |
| `destroy` | Instance bị destroy |
| Tên từ action `emit` | Event nghiệp vụ tùy chỉnh |

Ví dụ:

```js
document.addEventListener("product-tour:complete", (event) => {
  console.log(event.detail.answers);
});
```

## Bảng cấu hình đầy đủ

### Config cấp tour/manifest/page

| Field | Kiểu | Mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `id` | string | `default` | ID ổn định của tour hoặc manifest |
| `version` | string/number | `1` | Đổi giá trị để tour đã xem được hiện lại |
| `autoStart` | boolean | `true` | Tự chạy khi khởi tạo |
| `showOnce` | boolean | `true` | Ghi nhớ và chỉ tự hiện một lần |
| `markOnDismiss` | boolean | `true` | Xem dismiss là đã xem tour |
| `storage` | string | `local` | `local`, `session` hoặc `none` |
| `storageKey` | string | `product-tour` | Prefix của completion key |
| `startDelay` | number | `0` | Số ms chờ trước khi bắt đầu |
| `targetTimeout` | number | `3000` | Số ms chờ target render |
| `scrollBehavior` | string | `smooth` | Cách tự cuộn đến target: `smooth` hoặc `auto` |
| `onMissingTarget` | string | `skip` | `skip` step hoặc `abort` tour |
| `closeOnEscape` | boolean | `true` | Cho phép Escape đóng tour |
| `closeOnOverlayClick` | boolean | `false` | Cho phép click overlay đóng tour |
| `showCloseButton` | boolean | `true` | Hiện nút `×`; step có thể override |
| `allowHtml` | boolean | `false` | Render `content` bằng HTML |
| `progress` | object | `text`, `bottom-left` | Kiểu và vị trí tiến độ |
| `labels` | object | Tiếng Anh | Nhãn mặc định |
| `theme` | object | Xem phần Theme | Màu và hình thức chính |
| `steps` | array | Bắt buộc với tour/page | Danh sách step |
| `pages` | array | — | Danh sách page trong manifest |
| `include` | array | — | Danh sách file manifest/page con |
| `watchRoutes` | boolean | `true` | Theo dõi route với manager |

### Config của step

| Field | Kiểu | Mặc định | Ý nghĩa |
| --- | --- | --- | --- |
| `id` | string | `step-<n>` | ID duy nhất trong tour |
| `type` | string | Theo target | `tooltip`, `modal` hoặc `question` |
| `target` | string/null | `null` | CSS selector; bắt buộc với tooltip |
| `title` | string | `""` | Tiêu đề |
| `content` | string | `""` | Nội dung |
| `placement` | string | `auto` hoặc `center` | Vị trí popover |
| `allowInteraction` | boolean | `true` | Cho phép tương tác với target |
| `nextOnTargetClick` | boolean | `false` | Sang step tiếp theo khi click target |
| `showCloseButton` | boolean | Kế thừa | Override nút `×` |
| `padding` | number | `8` | Khoảng trống quanh spotlight |
| `progress` | object | Kế thừa | Override tiến độ |
| `fields` | array | — | Field của question |
| `actions` | array | Nút mặc định | Thay toàn bộ nút footer |
| `next` | string/array | Step kế tiếp | Chuyển thẳng hoặc rẽ nhánh |

Nếu `type` bị bỏ trống: có `target` thì mặc định là tooltip, không có `target` thì mặc định là modal.

### Config của page

| Field | Bắt buộc | Ý nghĩa |
| --- | --- | --- |
| `id` | Có | ID page duy nhất |
| `match` | Có | Route matcher |
| `steps` | Có | Tour của page |
| `enabled` | Không | Bật/tắt page; mặc định `true` |
| Option cấp tour | Không | Override cấu hình kế thừa từ manifest |

## JSON Schema

Package phát hành kèm `product-tour.schema.json` và export subpath `product-tour-js/schema`.

`$schema` chỉ giúp editor gợi ý field, autocomplete và báo lỗi JSON. Thư viện không cần field này để chạy nên có thể bỏ:

```json
{
  "$schema": "./product-tour.schema.json",
  "id": "welcome",
  "steps": [
    {
      "type": "modal",
      "title": "Chào mừng"
    }
  ]
}
```

Nếu dùng `$schema`, đường dẫn phải đúng tương đối với vị trí file JSON trong project. Có thể copy schema từ package:

```text
node_modules/product-tour-js/product-tour.schema.json
```

Việc kiểm tra schema trong editor không thay thế validation runtime. `defineTourConfig` và `loadTourConfig` vẫn kiểm tra các cấu hình quan trọng khi chạy.

## Bàn phím và accessibility

- Popover dùng `role="dialog"` và `aria-modal="true"`.
- Focus được đưa vào popover khi step hiện.
- Tab được giữ trong các control của tour.
- Escape đóng tour khi `closeOnEscape` bật.
- Arrow Right sang step tiếp theo khi focus không nằm trong input.
- Arrow Left quay lại khi focus không nằm trong input.
- Focus được trả lại phần tử trước đó khi tour đóng.
- Progress có label dành cho screen reader.
- Nếu user bật `prefers-reduced-motion`, các transition CSS được giảm.
- Auto-scroll chuyển sang `behavior: "auto"` khi user bật `prefers-reduced-motion`.
- Khi tour active, wheel/touch bên ngoài popover bị chặn; nội dung dài trong popover vẫn cuộn được.

## Chạy demo, test package và publish npm

### Chạy demo trong repository

```bash
npm install
npm run demo
```

Mở:

```text
http://localhost:4173/demo/
```

Demo hiện tại minh họa multi-page, file include, modal, question, tooltip, rẽ nhánh và event.

### Chạy test và build

```bash
npm test
npm run build
npm run test:package
```

Chạy toàn bộ:

```bash
npm run validate
```

`validate` chạy unit test, build lại `dist` và kiểm tra ESM, CommonJS cùng browser bundle.

### Test trong một project khác trước khi publish

Cách gần giống package npm thật nhất là tạo tarball:

```bash
npm run validate
npm pack
```

Lệnh tạo file dạng:

```text
product-tour-js-x.y.z.tgz
```

Trong project cần test:

```bash
npm install "C:\duong-dan\product-tour-js\product-tour-js-x.y.z.tgz"
```

Sau đó import bình thường:

```js
import { initProductTour } from "product-tour-js";
```

### Kiểm tra nội dung package

```bash
npm run pack:check
```

### Publish

```bash
npm login
npm publish
```

Hook `prepack` tự chạy test, build và kiểm tra bundle trước khi đóng gói. Tăng `version` trong `package.json` trước khi publish phiên bản mới.

### Tự động publish npm khi push GitHub

Repository có workflow [`.github/workflows/publish.yml`](./.github/workflows/publish.yml). Khi có commit mới trên `main`, workflow sẽ:

1. Cài dependency bằng `npm ci`.
2. Chạy toàn bộ `npm run validate`.
3. Đọc `name` và `version` trong `package.json`.
4. Bỏ qua publish nếu version đã tồn tại trên npm.
5. Publish kèm provenance nếu đây là version mới.

Để workflow được quyền publish mà không lưu token dài hạn, cấu hình npm Trusted Publisher cho package:

| Field | Giá trị |
| --- | --- |
| Provider | GitHub Actions |
| Organization/User | `phuthai02` |
| Repository | `product-tour-js` |
| Workflow filename | `publish.yml` |

Sau khi cấu hình một lần, mỗi bản phát hành chỉ cần tăng version rồi push:

```bash
npm version patch
git push origin main --follow-tags
```

npm không cho ghi đè version đã publish. Nếu không tăng version, workflow vẫn chạy validate nhưng sẽ bỏ qua bước publish.

## Xử lý lỗi thường gặp

### Tour không hiện

Kiểm tra:

- `autoStart` có đang là `false` không.
- Tour đã có completion key trong storage chưa.
- `showOnce` có đang bật không.
- Route hiện tại có khớp `match` không.
- Page có `enabled: false` không.
- Console có lỗi tải JSON hoặc validation không.

Để kiểm tra nhanh:

```js
tour.reset();
await tour.start({ force: true });
```

### Không tìm thấy target

- Xác nhận selector dùng được với `document.querySelector()`.
- Tăng `targetTimeout` nếu component render chậm.
- Dùng `onMissingTarget: "skip"` để bỏ qua step.
- Dùng `onMissingTarget: "abort"` để đóng tour.

```json
{
  "targetTimeout": 5000,
  "onMissingTarget": "skip"
}
```

### File JSON trả về 404

Đảm bảo file nằm trong thư mục static/public được server phục vụ. Với URL `/product-tour.json`, thử mở trực tiếp URL đó trên trình duyệt.

### Include không tải đúng đường dẫn

Đường dẫn include được tính từ file chứa `include`, không phải luôn từ file main và cũng không phải từ file JavaScript.

### Tour hiện lại sau mỗi lần refresh

Kiểm tra:

- `storage` không phải `none`.
- Trình duyệt không chặn storage.
- `id` và `version` không thay đổi ngoài ý muốn.
- Tour có thực sự `complete` hoặc `dismiss` với `markOnDismiss: true`.

### Ẩn nút đóng nhưng vẫn thấy nút Bỏ qua

`showCloseButton: false` chỉ ẩn nút `×`. Hãy tự cấu hình `actions` và bỏ action `dismiss` nếu không muốn footer có nút `Bỏ qua`.

### Dùng với SPA

Target render động được chờ tối đa `targetTimeout`. `watchRoutes` chỉ quan sát thay đổi URL; thư viện không điều hướng sang page khác. Sau một điều hướng do ứng dụng thực hiện, manager sẽ tự refresh nếu `watchRoutes` bật.

### Auto-scroll quá chậm

Đặt `scrollBehavior: "auto"` ở cấp tour, manifest hoặc page:

```json
{
  "scrollBehavior": "auto",
  "steps": [
    { "target": "#result", "title": "Kết quả" }
  ]
}
```

`smooth` dùng animation do trình duyệt điều khiển nên không hỗ trợ duration cố định. `auto` cuộn ngay và tour chỉ chờ một frame trước khi hiển thị spotlight mới.

### Translation key hiện nguyên dạng

- Kiểm tra chuỗi JSON bắt đầu đúng prefix `i18n:`.
- Đảm bảo đã truyền callback `translate` cho `ProductTourService`.
- Với thư viện dịch tải dữ liệu bất đồng bộ, trả Promise từ callback `translate`.
- Nếu dùng prefix khác, đặt `translationPrefix` tương ứng.

### ProductTourService tải lại manifest mỗi lần startPage

Đây là mặc định để nhận nội dung mới nhất. Dùng `startPage(pageId, { reload: false })` nếu muốn tái sử dụng manager đã tải. Có thể đặt `cacheBust: false` ở service hoặc trong `reload({ cacheBust: false })` nếu server đã có chiến lược cache riêng.

## Trạng thái phiên bản

- Badge npm ở đầu README phản ánh version và lượt tải hiện tại trên registry.
- Nhánh `main` là tài liệu và source mới nhất.
- Từ npm `0.4.0`, package có `ProductTourService` framework-neutral và option `scrollBehavior`.
- Từ npm `0.4.2`, package có Angular adapter `product-tour-js/angular` và `product-tour-js/angular/ngx-translate`.
- Từ npm `0.4.3`, Angular subpath có type fallback cho TypeScript dùng `moduleResolution: "node"`.
- Để kiểm tra version thực tế đang cài: `npm ls product-tour-js`.

## License

MIT License — Copyright (c) 2026 thaidp.
