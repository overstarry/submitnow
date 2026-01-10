mod app;
mod models;
mod services;
mod utils;

use gpui::*;
use app::IndexNowApp;

fn main() {
    App::new().run(|cx: &mut AppContext| {
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(Bounds {
                    origin: Point::new(px(100.0), px(100.0)),
                    size: Size {
                        width: px(800.0),
                        height: px(600.0),
                    },
                })),
                titlebar: Some(TitlebarOptions {
                    title: Some("IndexNow GUI".into()),
                    appears_transparent: false,
                    traffic_light_position: None,
                }),
                focus: true,
                show: true,
                kind: WindowKind::Normal,
                is_movable: true,
                display_id: None,
                center: false,
            },
            |cx| cx.new_view(|cx| IndexNowApp::new(cx))
        ).ok();
    });
}
