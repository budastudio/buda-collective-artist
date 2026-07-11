console.log("[Buda Admin] Loading...")


const container = document.getElementById("artists")


async function loadArtists(){

    try{

        const { data, error } = await window.budaSupabase.client
        .from("artists")
        .select("*")
        .order("created_at",{ascending:false})


        if(error) throw error


        renderArtists(data)


    }catch(err){

        console.error(err)

        container.innerHTML =
        "Error loading artists"

    }

}



function renderArtists(artists){

    container.innerHTML=""


    artists.forEach(artist=>{


        const card=document.createElement("div")

        card.className="artist-card"


        card.innerHTML=`

        <img class="avatar"
        src="${artist.avatar_url || 'https://via.placeholder.com/100'}">


        <div class="info">

            <h2>${artist.name || "Unnamed Artist"}</h2>


            <p>
            🌎 ${artist.country || "No country"}
            </p>


            <p>
            💳 ${artist.wallet || "No wallet"}
            </p>


            <p>
            🔗 
            <a href="${artist.x_link || '#'}" target="_blank">
            X profile
            </a>
            </p>


            <div class="badges">


            <span class="badge ${
            artist.status==="approved"
            ?"green":"yellow"
            }">

            ${
            artist.status==="approved"
            ?"Approved ✅"
            :"Pending ⏳"
            }

            </span>



            ${
            artist.wants_featured ?

            `
            <span class="badge gold">
            ⭐ Wants Featured
            </span>
            `

            :""
            }



            ${
            artist.featured ?

            `
            <span class="badge purple">
            ⭐ Featured Active
            </span>
            `

            :""
            }


            </div>


        </div>


        <div class="actions">


        ${
        artist.status !== "approved"

        ?

        `
        <button onclick="approveArtist('${artist.id}')">
        Approve Collective
        </button>
        `

        :""
        }



        ${
        artist.status==="approved"
        &&
        artist.wants_featured
        &&
        !artist.featured

        ?

        `
        <button onclick="enableFeatured('${artist.id}')">
        Enable Featured
        </button>
        `

        :""

        }



        </div>


        `


        container.appendChild(card)


    })

}





window.approveArtist = async function(id){


const {error}=await window.budaSupabase.client

.from("artists")

.update({

    status:"approved"

})

.eq("id",id)



if(error){

console.error(error)

alert("Approval error")

return

}


loadArtists()


}




window.enableFeatured = async function(id){


const {error}=await window.budaSupabase.client

.from("artists")

.update({

    featured:true,
    wants_featured:false

})

.eq("id",id)



if(error){

console.error(error)

alert("Featured error")

return

}


loadArtists()


}



loadArtists()