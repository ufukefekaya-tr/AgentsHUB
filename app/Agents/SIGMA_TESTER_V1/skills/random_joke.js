/*
name: "random_joke"
description: "✨ YETENEK ÜRETİCİ — Ajana istediğiniz bir iş programını söylerseniz anında o programın yeteneğini yazar ve kendine kaydeder. Örneğin: "Bana döviz fiyatlarını okuyacak ufak program yaz" vb..."
version: "1.0.0"
*/


function random_joke() {
  const jokes = [
    "Temel ile Dursun iddiaya girmişler. Temel kazanmış, Dursun kaybetmiş. Temel: 'Ben sana demiştim, ben kazanırım.' Dursun: 'Nereden bildin?' Temel: 'Benim adım Temel, senin adın Dursun.'",
    "Bir adam doktora gitmiş ve 'Doktor bey, her sabah uyandığımda kendimi bir kedi gibi hissediyorum.' demiş. Doktor: 'Ne zamandan beri böyle hissediyorsunuz?' Adam: 'Küçükken bir kediydim.'",
    "İki domates konuşuyormuş. Biri diğerine 'Hadi koşalım!' demiş. Diğeri 'Koşamayız ki, ketçap oluruz!' demiş."
  ];
  const randomIndex = Math.floor(Math.random() * jokes.length);
  return jokes[randomIndex];
}
