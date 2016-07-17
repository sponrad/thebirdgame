using UnityEngine;
using System.Collections;

public class BalloonControlScript : MonoBehaviour {

	public float explosionRadius = 3f;
	public float speed = 8f;
	private Vector3 direction;
	private Bounds levelBounds;
	private GameObject control;


	// Use this for initialization
	void Start () {
		direction = transform.up;
		control = GameObject.Find ("SkySceneControl");
		levelBounds = control.GetComponent<SkySceneControl> ().levelBounds;
	}
	
	// Update is called once per frame
	void Update () {
		float x = Random.Range (-1f, 1f);
		float y = Random.Range (-1f, 1f);
		direction = new Vector3 (direction.x + x, direction.y + y, 0f);

		transform.position += direction * speed * Time.deltaTime;

		if (!levelBounds.Contains (transform.position)) {
			transform.position = levelBounds.ClosestPoint (transform.position);
			direction = new Vector3(0f, 0f, 0f);
		}
	}

	void OnTriggerEnter2D(Collider2D coll){
		if (coll.gameObject.name == "plane") {
			Vector3 colliderPosition = transform.position + (Vector3)gameObject.GetComponent<CircleCollider2D> ().offset;

			control.GetComponent<SkySceneControl>().SoundBalloonPop ();

			//blow up the birds!
			Collider2D[] enemies = Physics2D.OverlapCircleAll(colliderPosition, explosionRadius);
			for (int i = 0; i < enemies.Length; i++) {
				if (enemies [i].gameObject.name == "bird(Clone)") {
					//Destroy (enemies [i].gameObject);
					enemies [i].gameObject.GetComponent<BirdControlScript> ().hit (transform.position);
				}
			}

			Globals.score += 25 * Globals.scoreMultiplier;

			Instantiate(coll.gameObject.GetComponent<PlaneControlScript>().balloonPopParticle , new Vector3(colliderPosition.x, colliderPosition.y, -2f), Quaternion.identity);

			//destroy the balloon
			Destroy (this.gameObject);
		}
	}
}
