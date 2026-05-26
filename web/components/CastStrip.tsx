import Image from "next/image";
import type { CastMember } from "@/lib/types";

const TMDB_PROFILE_BASE = "https://image.tmdb.org/t/p/w185";

export function CastStrip({ cast }: { cast: CastMember[] }) {
  return (
    <div className="cast-strip">
      {cast.map((member, index) => (
        <div className="cast-card" key={`${member.name}-${index}`}>
          <div className="cast-photo">
            {member.profile_path ? (
              <Image
                src={`${TMDB_PROFILE_BASE}${member.profile_path}`}
                alt={member.name}
                fill
                sizes="(max-width: 540px) 45vw, 120px"
              />
            ) : (
              <div className="cast-photo-empty" aria-hidden="true">
                ?
              </div>
            )}
          </div>
          <div className="cast-name">{member.name}</div>
          {member.character && (
            <div className="cast-character">{member.character}</div>
          )}
        </div>
      ))}
    </div>
  );
}
