async function fetchApprovedArtistById(id) {

  const { data, error } = await client
    .from(ARTISTS_TABLE)
    .select(`
      id,
      name,
      x_link,
      country,
      wallet,
      marketplace,
      website,
      avatar_url,
      bio,
      works,
      featured,
      founder,
      founder_number,
      founder_since,
      rarity,
      hero_image_url,
      statement,
      youtube_url,
      work_1_image,
      work_1_link,
      work_2_image,
      work_2_link,
      created_at
    `)
    .eq('status', 'approved')
    .eq('id', id)
    .single();


  if (error) throw error;

  return data;

}


window.budaSupabase = {
  client,
  uploadAvatar,
  registerArtist,
  fetchApprovedArtists,
  fetchApprovedArtistById
};


})();
