/*
name: "selamlama"
description: "Kullanıcıyı ismini kullanarak "İyi günler" diyerek selamlar."
version: "1.0.0"
*/


export const action = async (args, context) => {
  const name = args.name || 'Dostum';
  return `İyi günler ${name}!`;
};
