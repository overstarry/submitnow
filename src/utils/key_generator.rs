use rand::Rng;

pub struct KeyGenerator;

impl KeyGenerator {
    pub fn generate(length: usize) -> String {
        const CHARSET: &[u8] = b"0123456789abcdefABCDEF";
        let mut rng = rand::thread_rng();

        let length = length.clamp(8, 128);

        (0..length)
            .map(|_| {
                let idx = rng.gen_range(0..CHARSET.len());
                CHARSET[idx] as char
            })
            .collect()
    }

    pub fn generate_default() -> String {
        Self::generate(32) // 32 characters is a good default
    }
}
