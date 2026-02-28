import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tzjmorrkocoxihtsyrfy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6am1vcnJrb2NveGlodHN5cmZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNDk3MDUsImV4cCI6MjA4NzcyNTcwNX0.SirelOHD7cp51HyM7I5eKTchUfMrDss0asZfAJVo5k8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateStaff() {
  console.log('Deleting existing staff...');
  const { error: deleteError } = await supabase.from('staff').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (deleteError) {
    console.error('Error deleting staff:', deleteError);
    return;
  }
  
  console.log('Inserting new staff...');
  const newStaff = [
    { name: 'นายกิตติพงษ์ ชัยศรี' },
    { name: 'น.ส. วรรณภา สอนเสือ' },
    { name: 'น.ส.ศิรินชา พึ่งวงษ์เขียน' },
    { name: 'น.ส.นิธิพร ใสปา' },
    { name: 'นาย เกรียงศักดิ์ สุริยะลังกา' },
    { name: 'นายวิทวัส หมายมั่น' }
  ];
  
  const { error: insertError } = await supabase.from('staff').insert(newStaff);
  
  if (insertError) {
    console.error('Error inserting staff:', insertError);
  } else {
    console.log('Successfully updated staff list!');
  }
}

updateStaff();
