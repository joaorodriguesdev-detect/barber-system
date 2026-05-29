from sqlmodel import Session, select
from app.models import Post

def get_active_feed(session: Session, company_id: int):
    """
    Retorna o feed de posts ativos (filtrado por empresa).
    """
    statement = select(Post).where(Post.company_id == company_id).order_by(Post.id.desc())
    results = session.exec(statement).all()
    return results

def create_new_post(session: Session, company_id: int, barber_id: int, image_url: str, caption: str | None = None):
    """
    Cria uma nova publicação no feed com a imagem já salva no disco.
    """
    db_post = Post(
        company_id=company_id,
        barber_id=barber_id,
        image_url=image_url,
        caption=caption,
    )
    
    session.add(db_post)
    session.commit()
    session.refresh(db_post)
    
    return db_post

def delete_post(session: Session, company_id: int, post_id: int) -> bool:
    """
    Deleta uma publicação do feed pelo ID (com isolamento de empresa).
    Retorna True se deletou, False se não encontrou.
    """
    post = session.exec(select(Post).where(Post.id == post_id, Post.company_id == company_id)).first()
    if not post:
        return False
    session.delete(post)
    session.commit()
    return True

    
