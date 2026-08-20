// Uso: node --env-file=.env.local supabase/seed-test-users.mjs
// Crea un usuario de prueba por rol en el Supabase local, para poder hacer
// QA manual del frontend (Fase 1). Requiere `supabase start` corriendo y
// las migraciones aplicadas (`supabase db push`).
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const PASSWORD = 'Test1234!';

const USERS = [
  { role: 'dueno', email: 'dueno@test.local', fullName: 'Dueño de Prueba' },
  { role: 'admin', email: 'admin@test.local', fullName: 'Admin de Prueba' },
  { role: 'responsable_restaurante', email: 'responsable@test.local', fullName: 'Responsable de Prueba' },
  { role: 'validador_cortes', email: 'validador@test.local', fullName: 'Validador de Prueba' },
  { role: 'egresos', email: 'egresos@test.local', fullName: 'Egresos de Prueba' },
];

const userIdByRole = {};

for (const u of USERS) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
  });

  if (error) {
    console.error(`No se pudo crear ${u.email}:`, error.message);
    continue;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: data.user.id, full_name: u.fullName, email: u.email, role: u.role });

  if (profileError) {
    console.error(`No se pudo crear el profile de ${u.email}:`, profileError.message);
    continue;
  }

  userIdByRole[u.role] = data.user.id;
  console.log(`Creado: ${u.email} (${u.role})`);
}

const { data: restaurant, error: restaurantError } = await supabase
  .from('restaurants')
  .insert({ name: 'Restaurante de Prueba', address: 'Calle Falsa 123' })
  .select('id')
  .single();

if (restaurantError) {
  console.error('No se pudo crear el restaurante de prueba:', restaurantError.message);
} else if (userIdByRole.responsable_restaurante) {
  const { error: linkError } = await supabase
    .from('restaurant_users')
    .insert({ restaurant_id: restaurant.id, user_id: userIdByRole.responsable_restaurante });

  if (linkError) console.error('No se pudo asignar el restaurante:', linkError.message);
  else console.log(`Restaurante "${restaurant.name}" asignado a responsable@test.local`);
}

console.log(`\nContraseña de todos los usuarios de prueba: ${PASSWORD}`);
